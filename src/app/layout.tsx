import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Treenivihko",
  description: "Omat treenit, vihkoon ja kentälle.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fi">
      <body>{children}</body>
    </html>
  );
}
