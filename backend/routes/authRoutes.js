//router.routes for bundelling routes

const express = require("express");
const router = express.Router();

router
  .route("/google")
  .get(passport.authenticate("google", { scope: ["profile", "email"] }));

router.route("/google/callback").get(
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

module.exports = router;

// module.exports = function (app, passport) {
// app.get(
//   "/auth/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );
//   app.get(
//     "/auth/google/callback",
//     passport.authenticate("google", {
//       successRedirect: "/",
//       failureRedirect: "/login",
//     })
//   );

//   app.get(
//     "/connect/google",
//     passport.authorize("google", { scope: ["profile", "email"] })
//   );

//   app.get(
//     "/connect/google/callback",
//     passport.authorize("google", {
//       successRedirect: "/",
//       failureRedirect: "/login",
//     })
//   );

//   app.get("/unlink/google", isLoggedIn, function (req, res) {
//     var user = req.user;
//     user.google.token = undefined;
//     user.save(function (err) {
//       res.redirect("/profile");
//     });
//   });
// };

// function isLoggedIn(req, res, next) {
//   if (req.isAuthenticated()) return next();

//   res.redirect("/");
// }
