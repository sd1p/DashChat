const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

//email unique✅
//name change once
//photo form strat
//password optional only for jwt
//provider
//provider id
//verified later in future update
//always send mongoose user _id for cookie/session
//OPTIONAL
// provider: { type: String, required: true },
// providerId: { type: String },
const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    password: { type: String },
    email: { type: String, unique: true },
    photo: {
      type: String,
      required: true,
      default:
        "https://icon-library.com/images/anonymous-user-icon/anonymous-user-icon-2.jpg",
    },
    provider: { type: String },
    providerID: { type: String },
  },
  { timestamps: true }
);

//for jwt method
userSchema.methods.comparePassword = async function (password) {
  if (password === "" || !password) {
    return false;
  }
  return bcrypt.compare(password, this.password);
};

userSchema.pre("save", async function (next) {
  if (!this.password) {
    next();
  }
  if (!this.isModified("password")) {
    next();
  }
  this.password = bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model("User", userSchema);
