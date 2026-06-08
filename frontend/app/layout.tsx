import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Liwaza eGov MCP — Assistant Fiscal & Social Camerounais",
  description:
    "Plateforme IA-native pour les PME camerounaises. Calculez vos cotisations CNPS, IRPP, TVA et consultez les indicateurs économiques officiels en langage naturel.",
  keywords:
    "eGov, Cameroun, CNPS, IRPP, TVA, DGI, Banque Mondiale, PME, Fiscalité, MCP",
  authors: [{ name: "Liwaza Team", url: "https://liwaza.org" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${inter.variable} ${jakarta.variable}`}>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}