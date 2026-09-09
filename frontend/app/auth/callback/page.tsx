"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || "https://ai-powered-document-and-image.onrender.com";

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuthTokens } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");

    if (accessToken && refreshToken) {
      // Fetch current user details
      fetch(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then((res) => res.json())
        .then((user) => {
          setAuthTokens(accessToken, refreshToken, user);
          router.push("/");
        })
        .catch((err) => {
          console.error("Failed to fetch user profile after Google OAuth:", err);
          router.push("/login?error=oauth");
        });
    } else {
      router.push("/login");
    }
  }, [searchParams, router, setAuthTokens]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 transition-colors duration-300">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Completing Google Sign-In...</h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm">Please wait while we log you in securely.</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
