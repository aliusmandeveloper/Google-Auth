const express = require("express");
const {
  register,
  verifyEmail,
  loginUser,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.get("/verify/:token", verifyEmail);
router.post("/login", loginUser);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;

