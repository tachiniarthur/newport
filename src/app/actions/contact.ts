"use server";

import { getDictionary, isLocale, type Locale } from "@/content/dictionaries";
import { EMPTY_CONTACT_VALUES, type ContactState } from "@/lib/contact";

/**
 * Contact form submission.
 *
 * EmailJS is the provider, but it is called from here rather than from the
 * browser. Two reasons: the brief requires validation on the server, and a
 * Server Action gives it one; and the EmailJS private key stays on the server
 * instead of being shipped in the bundle where anyone can use it to send mail
 * through the account.
 *
 * Required environment variables (set these in Vercel):
 *   EMAILJS_SERVICE_ID
 *   EMAILJS_TEMPLATE_ID
 *   EMAILJS_PUBLIC_KEY    — the "user_id" in EmailJS's API
 *   EMAILJS_PRIVATE_KEY   — the access token that authorises non-browser calls
 *
 * With any of them missing the form reports that it is not connected and
 * points at the email address, rather than silently pretending to send.
 */

const ENDPOINT = "https://api.emailjs.com/api/v1.0/email/send";

const LIMITS = {
  name: { min: 1, max: 100 },
  email: { max: 254 },
  message: { min: 10, max: 4000 },
} as const;

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

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    return { status: "notConfigured", errors: {}, message: copy.states.notConfigured, values };
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          from_name: name,
          reply_to: email,
          message,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[contact] EmailJS rejected the request", response.status, await response.text());
      return { status: "error", errors: {}, message: copy.states.error, values };
    }

    return { status: "success", errors: {}, message: copy.states.success, values: EMPTY_CONTACT_VALUES };
  } catch (error) {
    console.error("[contact] EmailJS request failed", error);
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
