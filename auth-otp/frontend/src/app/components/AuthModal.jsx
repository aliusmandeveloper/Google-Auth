"use client";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useSearchParams } from "next/navigation";

export default function AuthModal({ onClose, onLoginSuccess }) {
  const [view, setView] = useState("choice"); // choice | login | signup | otp | forgot | reset
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [pendingEmail, setPendingEmail] = useState(""); // ✅ Save email for OTP
  const [userEmail, setUserEmail] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    // Email verify -> show login
    if (searchParams.get("verified") === "true") {
      Swal.fire({
        icon: "success",
        title: "Email Verified!",
        text: "Your account is ready. Please login now.",
      });
      setView("login");
    }

    // Password reset -> open reset view with token
    if (searchParams.get("reset") === "true") {
      const token = searchParams.get("token") || "";
      if (token) {
        setResetToken(token);
        setView("reset");
      }
    }
  }, [searchParams]);

  // ✅ Signup / Login submit
  // ✅ Signup / Login submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      const url =
        view === "signup"
          ? "http://localhost:5000/api/auth/register"
          : "http://localhost:5000/api/auth/login";

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (view === "signup" && result.status === "otp_sent") {
        // 🔑 Signup ke baad OTP flow
        setUserEmail(data.email);
        Swal.fire("OTP Sent!", "Check your email for the OTP.", "info");
        setView("otp");
      } else if (view === "login" && result.status === "success") {
        // 🔑 Direct login flow
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));
        onLoginSuccess?.(result.data.user, result.token);

        Swal.fire({
          icon: "success",
          title: "Welcome back!",
          text: "Login successful",
        }).then(() => {
          window.location.href = "/";
        });
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ OTP verification
  // ✅ OTP verification (Signup OR Forgot)
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const { otp } = Object.fromEntries(formData);

    try {
      // Agar signup OTP hai → verify API
      if (userEmail) {
        const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail, otp }),
        });
        const result = await res.json();

        if (result.status === "success") {
          localStorage.setItem("token", result.token);
          localStorage.setItem("user", JSON.stringify(result.data.user));
          onLoginSuccess?.(result.data.user, result.token);
          Swal.fire(
            "Verified!",
            "Your account is ready to use.",
            "success"
          ).then(() => {
            window.location.href = "/";
          });
        } else {
          setError(result.message || "Invalid OTP");
        }
      } else if (pendingEmail) {
        // Agar forgot password hai → reset view open
        Swal.fire("OTP Verified!", "Now set your new password.", "success");
        setView("reset");
      }
    } catch (err) {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Forgot password submit
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch(
        "http://localhost:5000/api/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        }
      );
      const result = await res.json();

      if (result.status === "otp_sent") {
        Swal.fire("OTP Sent!", "Check your email to reset password.", "info");
        setPendingEmail(data.email);
        setView("otp");
      } else {
        setError(result.message || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Reset password submit
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail, // 👈 yahan email bhejna hai
          otp: data.otp, // 👈 OTP bhi lena hoga form me
          password: data.password,
        }),
      });

      const result = await res.json();

      if (result.status === "success") {
        Swal.fire({
          icon: "success",
          title: "Password updated",
          text: "Please login with your new password.",
        }).then(() => {
          setView("login");
        });
      } else {
        setError(result.message || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 relative shadow-lg">
        {/* Close btn */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        {/* OTP Step */}
        {view === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Enter OTP</h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <input
              type="text"
              name="otp"
              placeholder="Enter 6-digit OTP"
              className="w-full p-3 border rounded-md"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        )}

        {/* TODO: keep the rest (choice, login, signup, forgot, reset) same as your existing code */}

        {/* Default Choice */}
        {view === "choice" && (
          <>
            <h2 className="text-gray-900 font-extrabold text-xl mb-1">
              Welcome!
            </h2>
            <p className="text-gray-700 text-sm mb-6">
              Sign up or log in to continue
            </p>

            {/* Google */}
            <button className="w-full border border-gray-300 hover:bg-gray-50 text-gray-900 py-2 rounded mb-3 flex items-center justify-center gap-2">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center mb-6">
              <hr className="border-gray-300 flex-grow" />
              <span className="text-gray-400 text-xs mx-3">or</span>
              <hr className="border-gray-300 flex-grow" />
            </div>

            {/* Login / Signup */}
            <button
              onClick={() => setView("login")}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 rounded mb-3"
            >
              Log in
            </button>
            <button
              onClick={() => setView("signup")}
              className="w-full border border-gray-700 text-gray-900 py-2 rounded"
            >
              Sign up
            </button>
          </>
        )}

        {/* Login */}
        {view === "login" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Login</h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <input
              type="email"
              name="email"
              placeholder="Email"
              className="w-full p-3 border rounded-md"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full p-3 border rounded-md"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <p className="text-sm text-right">
              <button
                type="button"
                onClick={() => setView("forgot")}
                className="text-blue-500 hover:underline"
              >
                Forgot password?
              </button>
            </p>

            <p className="text-sm text-center mt-4">
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => setView("signup")}
                className="text-blue-500 hover:underline"
              >
                Sign up here
              </button>
            </p>
          </form>
        )}

        {/* Signup */}
        {view === "signup" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sign Up</h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <input
              type="text"
              name="name"
              placeholder="Name"
              className="w-full p-3 border rounded-md"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              className="w-full p-3 border rounded-md"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              className="w-full p-3 border rounded-md"
              required
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              className="w-full p-3 border rounded-md"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded"
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>

            <p className="text-sm text-center mt-4">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-blue-500 hover:underline"
              >
                Login here
              </button>
            </p>
          </form>
        )}
        {view === "forgot" && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Forgot Password
            </h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              className="w-full p-3 border rounded-md"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>

            <p className="text-sm text-center mt-4">
              Remembered your password?{" "}
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-blue-500 hover:underline"
              >
                Back to login
              </button>
            </p>
          </form>
        )}
        {view === "reset" && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Reset Password
            </h2>
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <input
              type="text"
              name="otp"
              placeholder="Enter OTP"
              className="w-full p-3 border rounded-md"
              required
            />
            <input
              type="password"
              name="password"
              placeholder="New password"
              className="w-full p-3 border rounded-md"
              required
            />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm new password"
              className="w-full p-3 border rounded-md"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 text-white py-2 rounded"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
