//=== note: this file is USER routes, handles login, auth, etc.
const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Park = require("../models/park");
const asyncNode = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const middleware = require("../middleware");
//=== setup for image upload
const request = require("request");
const multer = require("multer");
const storage = multer.diskStorage({
    filename: function(req, file, callback){
        callback(null, Date.now() + file.originalname);
    }
});
const imageFilter = function(req, file, callback){
    //=== accepts image files only
    if(!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)){
        return callback(new Error('Only image files allowed!'), false);
    }
    callback(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter});
//=== setup for cloudinary
const cloudinary = require('cloudinary');
cloudinary.config({
    cloud_name: "dksnrtqyw",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

//=======================//
//=== ROUTES for users ===//
//=======================//

//=== ROOT route
router.get("/", function(req, res){
   res.render("landing"); 
});

//=== ABOUT static page
router.get("/about", function(req, res){
   res.render("about");
});

//=============================
//====     AUTH ROUTES     ====
//=============================

//=== Register route
router.get("/register", function(req, res){
    res.render("register");
});

//=== handles register logic
router.post("/register", function(req, res){
    //reminder: don't want unhashed password in User object!
        req.body.avatar = 'https://res.cloudinary.com/dksnrtqyw/image/upload/v1525027529/kd4cahckno54zuds6fld.png';
        var newUser = new User(
        {    
            username: req.body.username,
            email: req.body.email,
            avatar: req.body.avatar
        });
        if(req.body.adminCode === process.env.ADMIN_CODE){
            newUser.isAdmin = true;
        }
        User.register(newUser, req.body.password, function(err, user){
            if(err){
                req.flash("error", err.message);
                return res.redirect("/register"); //return breaks script
            }
            passport.authenticate("local")(req, res, function(){
                req.flash("success", "Welcome to Cal Parks, " + user.username + "!");
                res.redirect("/parks");
        });
    });
}); //end of post route for Register

//=== SHOW login form
router.get("/login", function(req, res){
    res.render("login");
});

//=== handle sign in logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/parks",
        failureRedirect: "/login",
    }), function(req, res){
});

//logout route
router.get("/logout", function(req, res){
    req.logout();
    req.flash("success","Logged You Out.");
    res.redirect("/parks");
});

//=== SHOW user profiles
router.get("/users/:id", function(req, res) {
    User.findById(req.params.id, function(err, foundUser) {
        if (err) {
            req.flash("error", "User not found");
            res.redirect("/parks");
        }
        Park.find().where('author.id').equals(foundUser._id).exec(function(err, parks) {
            if (err) {
                req.flash("error", "User not found");
                res.redirect("/parks");
            }
            res.render("users/show", { user: foundUser, parks: parks });
        });
    });
});

//=== SHOW EDIT form
router.get("/users/:id/edit",  function(req, res){
    User.findById(req.params.id, function(err, foundUser){
        if (err){
            req.flash("error", "Sorry, something went wrong.");
            res.redirect("back");
        }
        res.render("users/edit", {user: foundUser});
    })
})

//=== EDIT user profile
router.put("/users/:id", middleware.isLoggedIn,  upload.single('avatar'), function(req, res){
    User.findById(req.params.id, async function(err, user){
        if(err){
            console.log(err);
            req.flash("error", "Oops, something bad happened.");
            res.redirect("back");
        }   else {
            if(!req.file){
                user.firstName = req.body.user.firstName;
                user.lastName = req.body.user.lastName;
                user.username = req.body.user.username;
                user.email = req.body.user.email;
                user.bio = req.body.user.bio;
                user.save();
                }
            } 
                if(req.file ){
                try {
                    //await cloudinary.v2.uploader.destroy(user.avatarId);
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    user.avatarId = result.public_id;
                    user.avatar = result.secure_url;
                        }   catch(err)  {
                            req.flash("error", err.message);
                            return res.redirect("back");
                        }
                    }
                    user.firstName = req.body.user.firstName;
                    user.lastName = req.body.user.lastName;
                    user.username = req.body.user.username;
                    user.email = req.body.user.email;
                    user.bio = req.body.user.bio;
                    user.save();
                    req.flash("success", "User profile Successfully Updated!");
                    res.redirect("/users/" + user._id);
                });
}); //end route

//=== DESTROY user profile
router.delete('/user/:id', function(req, res){
    User.findById(req.params.id, async function(err, user){
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
        }
        try {
            await cloudinary.v2.uploader.destroy(user.avatarId);
            user.remove();
            req.flash('success', 'User Profile successfully deleted.');
            res.redirect('/parks');
        }   catch(err)  {
            if(err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
        }
    });
});

//SHOW forgot password route
router.get("/forgot", function(req, res){
    res.render("forgot");
});

//forgot password logic
router.post("/forgot", function(req, res, next){
    asyncNode.waterfall([
        function(done){
            crypto.randomBytes(20, function(err, buf){
                var token = buf.toString('hex');
                done(err, token);
            });
        },
        function(token, done){
            User.findOne({ email: req.body.email }, function(err, user){
                if(!user){
                    req.flash("error", "No account with that email address exists.");
                    return res.redirect("/forgot");
                }
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 1800000;  // 30 minutes
                
                user.save(function(err){
                    done(err, token, user);
                });
        });
        },
        function(token, user, done){
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth:{
                    user: 'quickfish02@gmail.com',
                    pass: process.env.GMAILPW2
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'quickfish02@gmail.com',
                subject: 'Parks Password Reset',
                text: 'You are receiving this because you (or someone else) requested the reset of the password for your account.\n\n' + 
                'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
                'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                'If you did not request this, please ignore this email and your password will remain unchanged.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err){
                console.log('mail sent');
                req.flash("success", "An email has been sent to " + user.email + " with further instructions.");
                done(err, 'done');
            });
        }
        ], function(err){
            if(err) return next(err);
            res.redirect("/forgot");
        });
});

router.get('/reset/:token', function(req, res){
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()}}, function(err, user){
        if(!user){
            req.flash('error', 'Password reset token is invalid or expired');
            return res.redirect("/forgot");
        }
        res.render('reset', {token: req.params.token});
    });
});

router.post('/reset/:token', function(req, res){
    asyncNode.waterfall([
        function(done){
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()} }, function(err, user){
                if(!user){
                  req.flash('error', 'Password reset token is invalid or has expired.');
                  return res.redirect('back');
                }
                if(req.body.password === req.body.confirm){
                    user.setPassword(req.body.password, function(err){
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;
                        
                        user.save(function(err){
                            req.logIn(user, function(err){
                                done(err, user);
                            });
                        });
                    })
                }   else {
                    req.flash("error", "Passwords do not match");
                    return res.redirect("back");
                }
        });
        },
        function(user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'quickfish02@gmail.com',
                    pass: process.env.GMAILPW2
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'quickfish02@gmail.com',
                subject: 'Your password has been changed',
                text: 'Hello,\n\n' +
                'This is confirmation that the password for your account ' +
                user.email + ' has just been changed.\n'
            };
            smtpTransport.sendMail(mailOptions, function(err){
                req.flash('success', 'Success! Your password has been changed.');
                done(err);
            });
        }
        ], function(err){
            console.log(err);
            res.redirect('/parks');
        });
});

module.exports = router;