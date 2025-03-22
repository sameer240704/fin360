import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { ClerkProvider } from "@clerk/nextjs";
import { GlobalProvider } from "@/context/GlobalContext";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Fin360°",
  description: "Created by Bournvita Smugglers",
};

export async function generateStaticParams() {
  return [{ lang: "en-US" }, { lang: "hi" }, { lang: "mr" }];
}

export default async function RootLayout({ children, params }) {
  return (
    <ClerkProvider>
      <GlobalProvider>
        <LanguageProvider>
          <html lang={(await params).lang} suppressHydrationWarning>
            <body
              className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
              <ThemeProvider attribute="class">{children}</ThemeProvider>
            </body>
            <Toaster position="top-center" reverseOrder={false} />
          </html>
        </LanguageProvider>
      </GlobalProvider>
    </ClerkProvider>
  );
}
