import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}