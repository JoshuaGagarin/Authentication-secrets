//jshint esversion:6
require('dotenv').config()
const express = require("express")
const bodyParser = require("body-parser")
const ejs = require("ejs")
const mongoose = require("mongoose")
const app = express()
const session = require('express-session')
const passport = require("passport")
const passportLocalMongoose = require("passport-local-mongoose")
const FacebookStrategy = require("passport-facebook").Strategy
const findOrCreate = require("mongoose-findorcreate");

app.use(express.static("public"))
app.set("view engine", "ejs")
app.use(bodyParser.urlencoded({extended:true}))

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}))

app.use(passport.session());
app.use(passport.initialize());


mongoose.connect("mongodb+srv://JoshuaGagarin:ELePysEI2dOXkIvt@cluster0.o1ytiec.mongodb.net/userDB?retryWrites=true&w=majority")

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  facebookId: String,
  secret: String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)
const User = new mongoose.model("User", userSchema)

passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback",
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home")
})

app.get("/login", function(req, res){
  res.render("login")
})

app.get("/register", function(req, res){
  res.render("register")
})

app.get("/secrets", function (req, res){
User.find({"secret": {$ne:null}}).then(function(foundUsers){
  res.render("secrets", {usersWithSecrets: foundUsers})
}).catch(function(err){
  console.log(err);
})
})

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit")
  } else {
    res.redirect("/login")
  }
})

app.post("/submit", function(req, res){
   const submittedSecret = req.body.secret
   console.log(req.user.facebookId);
User.findOne({facebookId:req.user.facebookId}).then(function(foundUser){
  foundUser.secret = submittedSecret
  foundUser.save().then(function(){
    res.redirect("/secrets")
  })
}).catch(function(err){
  console.log(err);
})
})

app.get("/logout", function(req, res){
  req.logout(function(err) {
     if (!err) {
     res.redirect('/');
   }
})
})

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.post("/register", function(req, res){
User.register({username: req.body.username}, req.body.password, function(err,user){
if (err){
  console.log(err);
  res.redirect("/register")
} else{
  passport.authenticate("local")(req, res, function(){
    // cant log req.user after passport authenticate
    res.redirect("/secrets")
  })
}
})
})

app.post("/login", function(req, res){
const user = new User ({
  username: req.body.username,
  password: req.body.password
})

req.login(user, function(err){
  if (err){
    console.log(err);
  } else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets")
    })

  }
})

})

app.listen(3000,function(){
  console.log("Server started at port 3000.");
})
