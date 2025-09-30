const User = require("../models/UserSignotp");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// 📩 Mailer setup
const transporter = nodemailer.createTransport({
  service: "gmail", // or smtp config
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 📌 Generate random 6 digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// 📩 Send OTP Email
const sendOtpEmail = async (email, otp) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
  });
};

// ---------------- SIGNUP ----------------
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const user = await User.findOne({ email });
    if (user) return res.json({ status: "error", message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const otp = generateOtp();
    const expiry = Date.now() + 5 * 60 * 1000; // 5 min

    const newUser = new User({
      name,
      email,
      password: hashed,
      otp,
      otpExpiry: expiry,
    });

    await newUser.save();
    await sendOtpEmail(email, otp);

    res.json({ status: "otp_sent", message: "OTP sent to email" });
  } catch (err) {
    res.json({ status: "error", message: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log("Verifying:", email, otp);

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    console.log("User found:", user);

    // ✅ Check OTP and expiry
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ status: "error", message: "Invalid OTP" });
    }

    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ status: "error", message: "OTP expired" });
    }

    // ✅ Clear OTP fields
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // ✅ Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      status: "success",
      message: "OTP verified successfully",
      token,
      data: { user },
    });
  } catch (err) {
    console.error("verifyOtp Error:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
};



// ---------------- LOGIN ----------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.json({ status: "error", message: "Invalid email" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ status: "error", message: "Invalid password" });

    // ✅ Direct JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      status: "success",
      message: "Login successful",
      token,
      data: { user },
    });
  } catch (err) {
    res.json({ status: "error", message: err.message });
  }
};


// ---------------- FORGOT PASSWORD ----------------
exports.forgotPassword = async (req, res) => {
  try {
    let { email } = req.body;
    if (!email) {
      return res.json({ status: "error", message: "Email is required" });
    }

    email = email.trim().toLowerCase(); // 👈 spaces + case fix

    console.log("Looking for email:", email); // Debug

    const user = await User.findOne({ email });
    console.log("User found:", user); // Debug

    if (!user) {
      return res.json({ status: "error", message: "User not found" });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();

    await sendOtpEmail(email, otp);

    res.json({ status: "otp_sent", message: "OTP sent for password reset" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.json({ status: "error", message: err.message });
  }
};




// ---------------- RESET PASSWORD ----------------
exports.resetPassword = async (req, res) => {
  try {
    let { email, otp, password } = req.body;
    email = email.toLowerCase();   // 🔑 normalize

    const user = await User.findOne({ email });
    if (!user) return res.json({ status: "error", message: "User not found" });

    if (user.otp !== otp || Date.now() > user.otpExpiry) {
      return res.json({ status: "error", message: "Invalid or expired OTP" });
    }

    const hashed = await bcrypt.hash(password, 10);
    user.password = hashed;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ status: "success", message: "Password updated" });
  } catch (err) {
    res.json({ status: "error", message: err.message });
  }
};

