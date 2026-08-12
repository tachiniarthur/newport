"use server";

import nodemailer from "nodemailer";

import { getDictionary, isLocale, type Locale } from "@/content/dictionaries";
import { IDENTITY } from "@/content/site";
import { EMPTY_CONTACT_VALUES, type ContactState } from "@/lib/contact";

/**
 * Contact form submission.
 *
 * The mail is handed straight to Gmail over SMTP, from the server. There is no
 * third party between the form and the inbox: SMTP is the actual protocol mail
 * moves on, and nodemailer is a thin client for it rather than a service.
 *
 * That it runs in a Server Action and not in the browser is the whole point.
 * The password authenticates the account, so it can only ever exist on the
 * server; the previous EmailJS setup was doing the same send with a key that
 * shipped in the bundle, which is an open relay for anyone who reads it.
 *
 * Required environment variables (set these in Vercel too):
 *   SMTP_USER      the Gmail address that authenticates and sends
 *   SMTP_PASSWORD  a Google App Password, not the account password
 *
 * With either of them missing the form reports that it is not connected and
 * points at the email address, rather than silently pretending to send.
 */

/** Gmail's submission endpoint. 465 is TLS from the first byte. */
const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 465;

/**
 * Where the form lands: the address the contact section already publishes, so
 * the form and the mailto link next to it can never drift apart.
 */
const TO_EMAIL = IDENTITY.email;

const LIMITS = {
  name: { min: 1, max: 100 },
  email: { max: 254 },
  message: { min: 10, max: 4000 },
} as const;

/**
 * One transport for the lifetime of the server process.
 *
 * A transport holds a connection pool, so building one per submission would
 * pay the TLS handshake and the SMTP auth round trip on every message. Built
 * on first use rather than at import, because the module is loaded even when
 * the credentials are absent and a transport with no auth is useless.
 */
let transport: nodemailer.Transporter | null = null;

function getTransport(user: string, pass: string): nodemailer.Transporter {
  transport ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user, pass },
  });
  return transport;
}

export async function submitContact(
  _previous: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const rawLang = String(formData.get("lang") ?? "");
  const lang: Locale = isLocale(rawLang) ? rawLang : "pt";
  const dict = await getDictionary(lang);
  const copy = dict.contact;

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  // Echoed back on every failure path so a rejected submission never costs the
  // visitor what they typed.
  const values = { name, email, message };

  // Honeypot. A real person never fills a field they cannot see; a bot fills
  // everything. Report success so the bot has nothing to learn from.
  if (String(formData.get("company") ?? "").length > 0) {
    return { status: "success", errors: {}, message: copy.states.success, values: EMPTY_CONTACT_VALUES };
  }

  const errors: ContactState["errors"] = {};
  if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
    errors.name = copy.validation.name;
  }
  if (!isEmail(email) || email.length > LIMITS.email.max) {
    errors.email = copy.validation.email;
  }
  if (message.length === 0) {
    errors.message = copy.validation.message;
  } else if (message.length < LIMITS.message.min) {
    errors.message = copy.validation.messageShort;
  } else if (message.length > LIMITS.message.max) {
    errors.message = copy.validation.messageShort;
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, message: null, values };
  }

  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!user || !password) {
    return { status: "notConfigured", errors: {}, message: copy.states.notConfigured, values };
  }

  try {
    await getTransport(user, password).sendMail({
      // Gmail rewrites From to the account that authenticated, so the visitor's
      // address cannot go here: it would be a forgery, and SPF would bounce it.
      // Their name is what survives in the header, and replyTo is what makes
      // answering one click instead of a copy and paste out of the body.
      from: { name: sanitizeHeader(name), address: user },
      to: TO_EMAIL,
      replyTo: { name: sanitizeHeader(name), address: email },
      subject: `${copy.mail.subject} ${sanitizeHeader(name)}`,
      // Plain text on purpose. There is no markup worth sending here, and a
      // text part is the one thing every client on earth renders correctly.
      text: [
        `${copy.form.name}: ${name}`,
        `${copy.form.email}: ${email}`,
        "",
        message,
      ].join("\n"),
    });

    return { status: "success", errors: {}, message: copy.states.success, values: EMPTY_CONTACT_VALUES };
  } catch (error) {
    console.error("[contact] SMTP send failed", error);
    return { status: "error", errors: {}, message: copy.states.error, values };
  }
}

/**
 * Deliberately permissive. The server cannot prove an address is deliverable,
 * so the only useful job here is catching an obvious typo without rejecting
 * the many valid addresses a strict pattern gets wrong.
 */
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * A newline in a value that is written into a header is a second header.
 * Nodemailer encodes these itself, but the name reaches two headers and a
 * subject, and stripping the line breaks at the door is cheaper than trusting
 * every path through the library.
 */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}
