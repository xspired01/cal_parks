const express = require("express");
const router = express.Router({mergeParams: true});
const Park = require("../models/park");
const Comment = require("../models/comment");
const middleware = require("../middleware");

//======================
//=== COMMENT ROUTES ===
//======================

//=== NEW Comment route form
router.get("/parks/:id/comments/new", middleware.isLoggedIn, function(req, res){
    console.log(req.params.id);
    Park.findById(req.params.id, function(err, park){
        if(err){
            console.log(err);
        }   else {
            res.render("comments/new", {park: park});
        }
    });
});

//=== CREATE Comment route
router.post("/parks/:id/comments", middleware.isLoggedIn, function(req, res){
    Park.findById(req.params.id, function(err, park){
        if(err){
            console.log(err);
            res.redirect("/parks");
        }   else    {
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    req.flash("error","Sorry. Something went wrong.");
                    console.log(err);
                }   else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    park.comments.push(comment);
                    park.save();
                    req.flash("success","Successfully added comment.");
                    res.redirect("/parks/" + park._id);
                }
            });
        }
    });
});

//Comment EDIT route
router.get("/parks/:id/comments/:comment_id/edit", middleware.checkCommentOwnership, function(req, res){
    Park.findById(req.params.id, function(err, foundPark){
        if(err || !foundPark){
            req.flash("error", "Cannot find that park.");
            return res.redirect("back");
        }
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err || !foundComment){
                req.flash("error", "Comment not found.");
                res.redirect("back");
            }   else {
                res.render("comments/edit", {park_id: req.params.id, comment: foundComment });
            }
        });
    });
});

//Comment UPDATE route
router.put("/parks/:id/comments/:comment_id", middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
        if(err){
            res.redirect("back");
        }   else {
            res.redirect("/parks/" + req.params.id);
        }
    });
});

//Comment DESTROY route
router.delete("/parks/:id/comments/:comment_id", middleware.checkCommentOwnership, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err){
            res.redirect("back");
        }   else {
            req.flash("success","Comment Removed");
            res.redirect("/parks/" + req.params.id);
        }
    });
});

module.exports = router;