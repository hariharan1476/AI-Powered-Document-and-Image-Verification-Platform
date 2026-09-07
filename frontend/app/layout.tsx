import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../src/contexts/AuthContext";
import Navbar from "../src/components/Navbar";

export const metadata: Metadata = {
  title: "AI Document & Image Verification",
  description:
    "AI-powered platform for document extraction, verification, authenticity, consistency, completeness, and tamper analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}