//file for all middleware
const Park = require("../models/park");
const Comment = require("../models/comment");
const middlewareObj = {};

middlewareObj.checkParkOwnership = function(req, res, next){
    if(req.isAuthenticated()){
        Park.findById(req.params.id, function(err, foundPark){
           if(err || !foundPark){
               req.flash("error","Park not found.");
               res.redirect("/parks");
           }    else   {
            if(foundPark.author.id.equals(req.user._id) || req.user.isAdmin){
                next();
            }   else {
                req.flash("error","You don't have permission to do that.");
                res.redirect("back");
            }
           }
        });
    }   else {
        req.flash("error","You need to be logged in to do that.")
        res.redirect("back");
    }
};

middlewareObj.checkCommentOwnership = function(req, res, next){
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment){
           if(err){
               req.flash("error", "Comment not found.");
               res.redirect("back");
           }    else   {
            if(foundComment.author.id.equals(req.user._id) || req.user.isAdmin){
                next();
            }   else {
                req.flash("error","You don't have permission to do that.");    
               res.redirect("back");
            }
           }
        });
    }   else {
        req.flash("error","You need to be logged in to do that");
        res.redirect("back");
    }
};

middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error","Please Login First!");
    res.redirect("/login");
};

module.exports = middlewareObj;