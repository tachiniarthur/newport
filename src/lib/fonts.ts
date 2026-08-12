import { JetBrains_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";

/**
 * Three type roles, no more. The grotesk/serif inversion — sans for display,
 * serif for reading — is deliberate and load-bearing for the identity.
 */

export const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "800"],
  variable: "--font-schibsted",
});

export const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const fontVariables = [
  schibsted.variable,
  newsreader.variable,
  jetbrains.variable,
].join(" ");
