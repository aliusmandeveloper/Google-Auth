const express = require("express");
const {
  register,
  verifyEmail,
  loginUser,
  googleLogin,
  forgotPassword,
  resetPassword,
  githubLogin,
  linkedinLogin,
  facebookLogin,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.get("/verify/:token", verifyEmail);
router.post("/login", loginUser);
router.post("/google-login", googleLogin);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/github-login", githubLogin);
router.post("/linkedin-login", linkedinLogin);
router.post("/facebook-login", facebookLogin);

module.exports = router;

