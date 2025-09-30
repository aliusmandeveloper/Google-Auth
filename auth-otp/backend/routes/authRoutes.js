const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/authController");

router.post("/register", authCtrl.signup);
router.post("/verify-otp", authCtrl.verifyOtp);
router.post("/login", authCtrl.login);
router.post("/forgot-password", authCtrl.forgotPassword);
router.post("/reset-password", authCtrl.resetPassword);

module.exports = router;
