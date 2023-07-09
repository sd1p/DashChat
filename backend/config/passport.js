//passport configuration for google and github stratergy.

const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

const User = require("../model/userModel");

//#TODO:
//server.js code
// require("./config/passport")(passport); // pass passport for configuration
//
module.exports = (passport) => {
  //taking passport class object from the server.js
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(err, user);
    });
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID:
          "491070811325-lskr9migjrp9vdl2jnbd4ihp8jp0k0m8.apps.googleusercontent.com",
        clientSecret: "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",
        callbackURL: "/auth/google/callback",
        passReqToCallback: true, // allows us to pass in the req from our route (lets us check if a user is logged in or not)
      },
      function (req, token, refreshToken, profile, done) {
        // asynchronous
        process.nextTick(function () {
          // check if the user is already logged in
          if (!req.user) {
            User.findOne({ "google.id": profile.id }, function (err, user) {
              if (err) return done(err);

              if (user) {
                // if there is a user id already but no token (user was linked at one point and then removed)
                if (!user.google.token) {
                  user.google.token = token;
                  user.google.name = profile.displayName;
                  user.google.email = (
                    profile.emails[0].value || ""
                  ).toLowerCase(); // pull the first email

                  user.save(function (err) {
                    if (err) return done(err);

                    return done(null, user);
                  });
                }

                return done(null, user);
              } else {
                var newUser = new User();

                newUser.google.id = profile.id;
                newUser.google.token = token;
                newUser.google.name = profile.displayName;
                newUser.google.email = (
                  profile.emails[0].value || ""
                ).toLowerCase(); // pull the first email

                newUser.save(function (err) {
                  if (err) return done(err);

                  return done(null, newUser);
                });
              }
            });
          } else {
            // user already exists and is logged in, we have to link accounts
            var user = req.user; // pull the user out of the session

            user.google.id = profile.id;
            user.google.token = token;
            user.google.name = profile.displayName;
            user.google.email = (profile.emails[0].value || "").toLowerCase(); // pull the first email

            user.save(function (err) {
              if (err) return done(err);

              return done(null, user);
            });
          }
        });
      }
    )
  );
};
