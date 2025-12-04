"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function LinkedInCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: errorDescription || "LinkedIn authentication failed",
      }).then(() => {
        router.push("/");
      });
      setProcessing(false);
      return;
    }

    if (code) {
      // Send code to backend
      fetch("http://localhost:5000/api/auth/linkedin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.data.user));
            Swal.fire({
              icon: "success",
              title: "Login Successful",
              text: "Welcome back!",
              timer: 1500,
              showConfirmButton: false,
            }).then(() => {
              window.location.href = "/";
            });
          } else {
            Swal.fire({
              icon: "error",
              title: "Login Failed",
              text: data.message || "LinkedIn authentication failed",
            }).then(() => {
              router.push("/");
            });
          }
        })
        .catch((err) => {
          console.error(err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Something went wrong during login",
          }).then(() => {
            router.push("/");
          });
        })
        .finally(() => {
          setProcessing(false);
        });
    } else {
      // No code and no error, just redirect home
      router.push("/");
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
        <p className="text-gray-600">Please wait while we log you in with LinkedIn.</p>
        <div className="mt-6 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0077b5]"></div>
        </div>
      </div>
    </div>
  );
}
