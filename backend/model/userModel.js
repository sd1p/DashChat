const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    photo: {
      type: String,
      required: true,
      default:
        "https://icon-library.com/images/anonymous-user-icon/anonymous-user-icon-2.jpg",
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (password) {
  if (password === "") {
    return false;
  }
  return bcrypt.compare(password, this.password);
};

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 12);
});

module.exports = mongoose.model("User", userSchema);
