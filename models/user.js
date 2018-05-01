const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

var UserSchema = new mongoose.Schema({
    firstName:  {   type: String    },
    lastName:   {   type: String    },
    bio:        {   type: String    },
    username:   {   type: String, required: true, unique:true   },   //need to check if this needs to be unique
    email:      {   type: String, required: true, unique: true  },  
    password:   {   type: String    },
    resetPasswordToken: {   type: String    },
    resetPasswordExpires: { type: String    },
    isAdmin:    {   type: Boolean, default: false   },
    avatar:     {   type: String    },
    avatarId:   {   type: String    }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);