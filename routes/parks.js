const express = require("express");
const router = express.Router();
const Park = require("../models/park");
const middleware = require("../middleware");
const escapeRegex = require('escape-regex');
const NodeGeocoder = require("node-geocoder");
const multer = require('multer');
//=== setup for image upload with multer 
const storage = multer.diskStorage({
    filename: function(req, file, callback){
        callback(null, Date.now() + file.originalname);
    }
});
const imageFilter = function(req, file, callback){
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
        return callback(new Error('Only image files are allowed'), false);
    }
    callback(null, true);
};
const upload = multer({ storage:storage, fileFilter:imageFilter});
//=== configure cloudinary 
const cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: "dksnrtqyw",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
//=== options for geocoder
const options = {
    provider:   'google',
    httpAdapter: 'https',
    apiKey: process.env.GEOCODER_API_KEY,
    formatter: null
};
const geocoder = NodeGeocoder(options);

//=======================//
//=== INDEX all parks ===//
//=======================//
router.get("/parks", function(req, res){
    var noMatch = null;
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search),'gi');
        Park.find({name: regex}, function(err, allParks){
            if(err){
                console.log(err);
            } else {
                if(allParks.length < 1){
                    noMatch = "No parks match that query, please try again.";
                }
                res.render("parks/index", { parks:allParks, currentUser: req.user, noMatch: noMatch});
            }
        });
    }   else {
    Park.find({}, function(err, allParks){
        if(err){
            console.log(err);
        }   else {
            res.render("parks", {parks: allParks, currentUser: req.user, noMatch: noMatch});
        }
    });
    }
});

//=== CREATE a new park add to db
router.post("/parks", middleware.isLoggedIn, upload.single('image'), function(req, res){
    var name = req.body.name;
    var desc = req.body.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    //== translates string into coordinates for Google Maps
    geocoder.geocode(req.body.location, function(err, data){
        if(err || !data.length){
            console.log(err);
            req.flash("error", "Invalid Address");
            return res.redirect("back");
        }
        var lat = data[0].latitude;
        var lng = data[0].longitude;
        var location = data[0].formattedAddress;
        //=== cloudinary for img upload
        cloudinary.v2.uploader.upload(req.file.path, function(err, result){
            if(err){
                req.flash('error', err.message);
                return res.redirect("back");
            }
            req.body.image = result.secure_url;
            req.body.imageId = result.public_id;
            //associates a user, location, image, etc. with new park
            var newPark = {
                    name: name, 
                    image: req.body.image,
                    imageId: req.body.imageId,
                    description: desc, 
                    author: author, 
                    location: location,
                    lat: lat,
                    lng: lng
            };
            Park.create(newPark, function(err, newlyCreated){
                if(err){
                    req.flash("error", err.message);
                    return res.redirect("back");
                }   else {
                    req.flash("success", "Successfully added park!");
                    res.redirect("parks");
                }
            });
        });//cloudinary closing bracket
    });//geocoder closing bracket
});

//=== NEW show form to make new park
router.get("/parks/new", middleware.isLoggedIn, function(req, res){
    res.render("./parks/new"); //can also do less verbose "parks/new"
});

//=== SHOW one park with :id (shows more info about park)
router.get("/parks/:id", function(req, res){
    //populate commments puts the comments under a park
    Park.findById(req.params.id).populate("comments").exec(function(err, foundPark){
        if(err || !foundPark){
            req.flash("error","Park not found.");
            res.redirect("back");
        }   else {
            console.log(foundPark);
            res.render("parks/show", {park: foundPark});  
        }
    });
});

//EDIT form for park with :id
router.get("/parks/:id/edit", middleware.checkParkOwnership, function(req, res){
        Park.findById(req.params.id, function(err, foundPark){
            if(err){
                req.flash("error","Sorry, something went wrong.");
                res.redirect("back");
            }
            res.render("parks/edit", {park: foundPark});
        });
});

//UPDATE park route
router.put("/parks/:id", middleware.checkParkOwnership, upload.single('image'), function(req, res){ 
    Park.findById(req.params.id, async function(err, park){
      if(err){
          req.flash("error", err.message);
          res.redirect("back");
      } else {
          if (req.file){
              try {
                  //delete old image
                  await cloudinary.v2.uploader.destroy(park.imageId);
                 //upload new image
                 let result = await cloudinary.v2.uploader.upload(req.file.path);
                 park.imageId = result.public_id;
                 park.image = result.secure_url;
              } catch(err){
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
          }
            //==== location
            geocoder.geocode(req.body.location, function (err, data) {
                if (err || !data.length) {
                  req.flash('error', 'Invalid address');
                  return res.redirect('back');
                }
            //==== update park information ====//
            //=== NOTE: depending on the format in the edit route name="name" or name="park[name]"
            //=== affects how to call the data object in functions either req.body.name or req.body.park.name
            park.name = req.body.park.name;
            park.description = req.body.park.description;
            park.location = data[0].formattedAddress;
            park.lat = data[0].latitude;
            park.lng = data[0].longitude;
            park.save();
            req.flash("success", "Park Updated!");
            res.redirect("/parks/" + park._id);
            });
        }
    });
});
    
//DESTROY park route
router.delete("/parks/:id", middleware.checkParkOwnership, function(req, res){
    Park.findByIdAndRemove(req.params.id, function(err){
        if(err){
            req.flash("error","Sorry, something went wrong.");
            res.redirect("/parks");
        }   else {
            req.flash("success","Park successfully deleted.");
            res.redirect("/parks");
        }
    });
});

module.exports = router;