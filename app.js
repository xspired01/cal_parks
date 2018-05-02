require('dotenv').config();

const express =  require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const LocalStrategy = require("passport-local");
//==== designating hosted(deploy) database2
mongoose.connect(process.env.DATABASEURL2);
//=== setup for npm packages
app.use(bodyParser.urlencoded({extended:true}));
//view engine
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(methodOverride("_method"));
app.use(cookieParser('secret'));
//flash messages at top of screen
app.use(flash());
//put time on park & comment posts
app.locals.moment = require('moment');
//=== database models
const Park = require("./models/park");
const Comment = require("./models/comment");
const User = require("./models/user");
//=== require Routes
const commentRoutes = require("./routes/comments");
const parkRoutes = require("./routes/parks");
const indexRoutes = require("./routes/index");
//=== Passport configuration
app.use(require("express-session")({
    secret: process.env.EXPRESS_SESSIONS_SECRET_KEY, 
    resave: false,
    saveUninitialized: false,
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next();
});
//=== server environment variables
const port = process.env.PORT;
const ip = process.env.IP;
const locus = require('locus');


//==============
//=== ROUTES ===
//==============
app.use(indexRoutes);
app.use(parkRoutes);
app.use(commentRoutes);

//=== start server
app.listen(port, ip, function(){
   console.log("Server started and listening on PORT: " + port + " and on IP: " + ip); 
});