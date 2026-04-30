"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.push("/dashboard");
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-ink">
          Kizaz <span className="text-accent">Command Center</span>
        </h1>
        <p className="mt-2 text-sm text-text">
          Sign in with Google to access your dashboard.
        </p>
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="mt-6 w-full bg-accent hover:bg-accent/90 text-white font-medium px-4 py-2.5 rounded-md transition"
        >
          Continue with Google
        </button>
        {session?.user?.email && (
          <p className="mt-4 text-xs text-text">
            Signed in as {session.user.email}
          </p>
        )}
      </div>
    </div>
  );
}
