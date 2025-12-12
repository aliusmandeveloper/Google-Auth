"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";

export default function GoogleWrapper({ children }) {
  return (
    <GoogleOAuthProvider
      clientId={
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        "183782225704-qrpnfu4ohu5gukc4s5f1c3eumv7kvk05.apps.googleusercontent.com"
      }
    >
      {children}
    </GoogleOAuthProvider>
  );
}
