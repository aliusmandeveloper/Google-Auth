"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";

export default function GitHubCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
          <p className="text-gray-600">Please wait while we log you in with GitHub.</p>
          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    }>
      <GitHubCallbackContent />
    </Suspense>
  );
}

function GitHubCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      // Send code to backend
      fetch("http://localhost:5000/api/auth/github-login", {
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
              text: data.message || "GitHub authentication failed",
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
      router.push("/");
    }
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
        <p className="text-gray-600">Please wait while we log you in with GitHub.</p>
        <div className="mt-6 flex justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      </div>
    </div>
  );
}
