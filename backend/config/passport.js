//passport configuration for google and github stratergy.

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;

const User = require("../model/userModel");

module.exports = (passport) => {
  //taking passport class object from the server.js
  passport.serializeUser((user, done) => {
    done(null, user.id); //user.id is the id from Mongo
  });

  passport.deserializeUser((id, done) => {
    User.findById(id).then((user) => {
      done(null, user);
    });
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GoogleClientID,
        clientSecret: process.env.GoogleClientSecret,
        callbackURL: "https://dashchat.onrender.com/api/auth/google/callback",
        // passReqToCallback: true, // allows us to pass in the req from our router.
      },
      async (req, token, refreshToken, profile, done) => {
        const user = await User.findOne({ email: profile.emails[0].value });
        //can add a feature to update username from the updated username in user profile
        if (user) {
          done(null, user);
        } else {
          const user = await new User({
            email: profile.emails[0].value,
            name: profile.displayName,
            photo: profile.photos[0].value,
            provider: profile.provider,
            // providerID: profile.id,
          }).save();
          done(null, user);
        }
      }
    )
  );
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GitHubClientID,
        clientSecret: process.env.GitHubClientSecret,
        callbackURL: "/api/auth/github/callback",
        // passReqToCallback: true, // allows us to pass in the req from our router.
      },
      async (req, token, refreshToken, profile, done) => {
        // console.log(profile);
        const user = await User.findOne({ providerID: profile.id });
        // can add a feature to update username from the updated username in user profile
        if (user) {
          done(null, user);
        } else {
          const user = await new User({
            name: profile.displayName,
            photo: profile.photos[0].value,
            provider: profile.provider,
            providerID: profile.id,
          }).save();
          done(null, user);
        }
      }
    )
  );
};
