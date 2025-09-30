const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  otp: String,
  otpExpiry: Date,
});

module.exports = mongoose.model("UserOtp", userSchema);
// models/User.js
userSchema.pre("save", function (next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  next();
});
