"use client";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { useSearchParams } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";

export default function AuthModal({ onClose, onLoginSuccess }) {
  const [view, setView] = useState("choice"); // choice | login | signup
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  console.log("Search params:", Array.from(searchParams.entries()));
  const [resetToken, setResetToken] = useState("");

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Only check passwords on signup
    if (view === "signup" && data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const url =
        view === "signup"
          ? `${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`
          : `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`;

      const body =
        view === "signup"
          ? { name: data.name, email: data.email, password: data.password }
          : { email: data.email, password: data.password };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (result.status === "success") {
        if (view === "signup") {
          Swal.fire({
            icon: "success",
            title: "User registered successfully",
            text: "Please check your email",
          }).then(() => {
            window.location.href = "/";
          });
        } else {
          localStorage.setItem("token", result.token);
          localStorage.setItem("user", JSON.stringify(result.data.user));
          onLoginSuccess?.(result.data.user, result.token);
          window.location.href = "/";
        }
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
  // ✅ Forgot password submit
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: data.email }),
        }
      );
      const result = await res.json();

      if (result.status === "success") {
        Swal.fire({
          icon: "success",
          title: "Check your inbox",
          text: "If that email exists, a reset link has been sent.",
        }).then(() => {
          // Go back to login or home, your choice
          window.location.href = "/";
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
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, password: data.password }),
        }
      );
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

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/google-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: credentialResponse.credential }),
        }
      );
      const result = await res.json();

      if (result.status === "success") {
        localStorage.setItem("token", result.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));
        onLoginSuccess?.(result.data.user, result.token);
        window.location.href = "/";
      } else {
        setError(result.message || "Google Login failed");
      }
    } catch (err) {
      console.error(err);
      setError("Could not connect to server");
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
            {/* Google */}
            <div className="w-full flex justify-center mb-3">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => {
                  console.log("Login Failed");
                  setError("Google Login Failed");
                }}
              />
            </div>

            {/* GitHub */}
            <button
              onClick={() => {
                const clientId = "Ov23li6lttrnIRhnfotT"; // Will be replaced or fetched from env
                const redirectUri = `${window.location.origin}/auth/github/callback`;
                window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
              }}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2 rounded mb-3 flex items-center justify-center gap-2"
            >
              <svg
                height="20"
                viewBox="0 0 16 16"
                version="1.1"
                width="20"
                aria-hidden="true"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
                ></path>
              </svg>
              Continue with GitHub
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => {
                const clientId = process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID;
                const redirectUri = `${window.location.origin}/auth/linkedin/callback`;
                const scope = "openid profile email";
                const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
                console.log("LinkedIn Auth URL:", authUrl);
                window.location.href = authUrl;
              }}
              className="w-full bg-[#0077b5] hover:bg-[#005582] text-white font-semibold py-2 rounded mb-3 flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              Continue with LinkedIn
            </button>

            {/* Facebook */}
            <button
              onClick={() => {
                const clientId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
                const redirectUri =
                  process.env.NEXT_PUBLIC_FACEBOOK_REDIRECT_URI;
                const state = "facebook_auth"; // Optional but recommended
                window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=email`;
              }}
              className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold py-2 rounded mb-3 flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
              </svg>
              Continue with Facebook
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

            <p className="text-sm text-center mt-4">
              Go back to{" "}
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-blue-500 hover:underline"
              >
                Login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
