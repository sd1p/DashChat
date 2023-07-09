//router.routes for bundeling routes

const express = require("express");
const passport = require("../config/passport");

const authRoutes = (passport) => {
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
  router
    .route("/github")
    .get(passport.authenticate("github", { scope: ["user:email"] }));

  router.route("/github/callback").get(
    passport.authenticate("github", {
      successRedirect: "/",
      failureRedirect: "/login",
    })
  );
  return router;
};

module.exports = authRoutes;
