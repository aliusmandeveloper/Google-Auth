const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/usersign");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "90d",
  });
};

// ✅ LOGIN API
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ status: "fail", message: "User not found" });
    }

    if (!user.isVerified) {
      return res
        .status(400)
        .json({ status: "fail", message: "Please verify your email first" });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ status: "fail", message: "Invalid email or password" });
    }

    const token = generateToken(user._id);

    res.json({
      status: "success",
      message: "Login successful",
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

exports.registerUser = async (req, res) => {
  const { email } = req.body;

  // yahan apna user save karne ka logic hoga...

  const verificationLink = `http://localhost:3000/verify?token=${token}`;

  await sendEmail(
    email,
    "Verify your email",
    `<p>Click the link below to verify your email:</p>
     <a href="${verificationLink}">${verificationLink}</a>`
  );

  res.json({ success: true, message: "Verification email sent!" });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ status: "fail", message: "User already exists" });
    }

    const user = await User.create({ name, email, password });

    // generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // verification link
    const url = `http://localhost:5000/api/auth/verify-email?token=${token}`;

    // send email
    await sendEmail(user.email, "Verify your email", `Click here: ${url}`);

    // ✅ send simple JSON response
    res.status(201).json({
      status: "success",
      message: "User registered successfully, please check your email",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

// Email Verify
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Invalid or missing token");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).send("User not found");
    }

    if (user.isVerified) {
      return res.redirect("http://localhost:3000/login");
    }

    user.isVerified = true;
    await user.save();

    // ✅ Redirect to frontend success page
    return res.redirect("http://localhost:3000/verify-success");
  } catch (error) {
    console.error(error);
    return res.status(400).send("Invalid or expired token");
  }
};

// ✅ Forgot Password: send reset link
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ status: "fail", message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal whether user exists
      return res.json({ status: "success", message: "If that email exists, a reset link was sent" });
    }

    // Create short-lived JWT reset token
    const token = jwt.sign(
      { id: user._id, type: "reset" },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Link points to your frontend to show reset form
    const resetUrl = `http://localhost:3000/?reset=true&token=${token}`;

    await sendEmail(
      user.email,
      "Reset your password",
      `Click the link to reset your password: ${resetUrl}`
    );

    return res.json({
      status: "success",
      message: "If that email exists, a reset link was sent",
    });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
};

// ✅ Reset Password: verify token and update password
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ status: "fail", message: "Token and new password are required" });
    }

    // Verify token
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ status: "fail", message: "Invalid or expired token" });
    }

    if (payload.type !== "reset") {
      return res.status(400).json({ status: "fail", message: "Invalid token type" });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return res.status(400).json({ status: "fail", message: "User not found" });
    }

    // Update password (assumes your User model hashes on save)
    user.password = password;
    await user.save();

    return res.json({ status: "success", message: "Password updated successfully. Please login." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
};




// ✅ Google Login
exports.googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { name, email, picture } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if not exists
      // Generate a random password for google users
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

      user = await User.create({
        name,
        email,
        password: randomPassword,
        isVerified: true, // Google emails are already verified
      });
    }

    const jwtToken = generateToken(user._id);

    res.json({
      status: "success",
      message: "Google login successful",
      token: jwtToken,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          picture,
        },
      },
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(400).json({ status: "fail", message: "Google login failed" });
  }
};

// ✅ GitHub Login
exports.githubLogin = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ status: "fail", message: "Authorization code is required" });
    }

    // 1. Exchange code for access token
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const { access_token, error } = tokenResponse.data;

    if (error || !access_token) {
      return res.status(400).json({ status: "fail", message: "GitHub authentication failed" });
    }

    // 2. Get user data
    const userResponse = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userData = userResponse.data;
    let email = userData.email;

    // 3. If email is private, fetch it separately
    if (!email) {
      const emailsResponse = await axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const primaryEmail = emailsResponse.data.find((e) => e.primary && e.verified);
      email = primaryEmail ? primaryEmail.email : null;
    }

    if (!email) {
      return res.status(400).json({ status: "fail", message: "GitHub email not found or not verified" });
    }

    // 4. Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      user = await User.create({
        name: userData.name || userData.login,
        email,
        password: randomPassword,
        isVerified: true,
        googleId: userData.id.toString(), // Using googleId field for now or we can add githubId
      });
    }

    const token = generateToken(user._id);

    res.json({
      status: "success",
      message: "GitHub login successful",
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("GitHub Login Error:", error.response?.data || error.message);
    res.status(500).json({ status: "error", message: "Server error during GitHub login" });
  }
};

// ✅ LinkedIn Login
exports.linkedinLogin = async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    console.log("LinkedIn Login Attempt");
    console.log("LINKEDIN_CLIENT_ID:", process.env.LINKEDIN_CLIENT_ID);
    console.log("Received Redirect URI:", redirectUri);
    console.log("Code:", code);

    if (!code) {
      return res.status(400).json({ status: "fail", message: "Authorization code is required" });
    }

    // 1. Exchange code for access token
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri || process.env.LINKEDIN_REDIRECT_URI);
    params.append("client_id", process.env.LINKEDIN_CLIENT_ID);
    params.append("client_secret", process.env.LINKEDIN_CLIENT_SECRET);

    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ status: "fail", message: "LinkedIn authentication failed" });
    }

    // 2. Get user profile
    const profileResponse = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const userData = profileResponse.data;
    const email = userData.email;

    if (!email) {
      return res.status(400).json({ status: "fail", message: "LinkedIn email not found" });
    }

    // 3. Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      user = await User.create({
        name: userData.name || `${userData.given_name} ${userData.family_name}`,
        email,
        password: randomPassword,
        isVerified: true,
        linkedinId: userData.sub, // 'sub' is the unique identifier in OpenID Connect
      });
    }

    const token = generateToken(user._id);

    res.json({
      status: "success",
      message: "LinkedIn login successful",
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("LinkedIn Login Error:", error.response?.data || error.message);
    res.status(500).json({
      status: "error",
      message: "Server error during LinkedIn login",
      details: error.response?.data || error.message
    });
  }
};

// ✅ Facebook Login
exports.facebookLogin = async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    console.log("Facebook Login Attempt");
    console.log("FACEBOOK_APP_ID:", process.env.FACEBOOK_APP_ID ? "Set" : "Missing");
    console.log("FACEBOOK_APP_SECRET:", process.env.FACEBOOK_APP_SECRET ? "Set" : "Missing");
    console.log("Received Redirect URI:", redirectUri);

    if (!code) {
      return res.status(400).json({ status: "fail", message: "Authorization code is required" });
    }

    // 1. Exchange code for access token
    const tokenResponse = await axios.get("https://graph.facebook.com/v18.0/oauth/access_token", {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: redirectUri || process.env.FACEBOOK_REDIRECT_URI, // Use frontend provided URI, fallback to env
        code,
      },
    });

    const { access_token } = tokenResponse.data;

    if (!access_token) {
      return res.status(400).json({ status: "fail", message: "Facebook authentication failed" });
    }

    // 2. Get user profile
    const profileResponse = await axios.get("https://graph.facebook.com/me", {
      params: {
        fields: "id,name,email,picture",
        access_token,
      },
    });

    const userData = profileResponse.data;
    const email = userData.email;

    if (!email) {
      return res.status(400).json({ status: "fail", message: "Facebook email not found" });
    }

    // 3. Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      user = await User.create({
        name: userData.name,
        email,
        password: randomPassword,
        isVerified: true,
        facebookId: userData.id,
      });
    }

    const token = generateToken(user._id);

    res.json({
      status: "success",
      message: "Facebook login successful",
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error("Facebook Login Error:", error.response?.data || error.message);
    res.status(500).json({ status: "error", message: "Server error during Facebook login" });
  }
};
