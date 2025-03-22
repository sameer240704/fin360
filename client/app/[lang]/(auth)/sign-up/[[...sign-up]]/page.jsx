"use client";

import { useLanguage } from "@/context/LanguageContext";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const { currentLang } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <SignUp
        routing="path"
        path={`/${currentLang}/sign-up`}
        redirectUrl={`/${currentLang}/overview`}
        signInUrl={`/${currentLang}/sign-in`}
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: "rounded-xl",
            headerTitle: "text-2xl font-bold",
            headerSubtitle: "text-gray-500",
            formButtonPrimary:
              "bg-primary-600 hover:bg-primary-700 w-full dark:border-dark-primary-800",
            socialButtonsBlockButton: "w-full",
            footerActionText: "text-center",
            footerActionLink: "text-primary-600 hover:text-primary-700 ml-1",
          },
        }}
      />
    </div>
  );
}
