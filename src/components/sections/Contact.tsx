"use client";

import { animate } from "animejs";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { submitContact } from "@/app/actions/contact";
import type { Dictionary, Locale } from "@/content/dictionaries";
import { IDENTITY } from "@/content/site";
import { INITIAL_CONTACT_STATE, type ContactState } from "@/lib/contact";
import { DURATION } from "@/lib/motion/config";

/**
 * The end of the cable, and the one full-bleed surface on the site.
 *
 * Everything above this section is on the page's own colour and reveals itself
 * as it comes into view. This one does not: it is wired. The cable comes apart
 * on the panel's top edge, the panel takes the colour of the wire, and each
 * `[data-tap]` block below arrives as the reader brings it up — which is why
 * nothing here carries `data-reveal`, and why the two reveal hooks every other
 * section uses are absent. Two systems animating one element is one of them
 * losing. All of it is driven by `CableTrace`, off the same head the cable
 * itself is drawn to.
 *
 * `--color-paper` is re-pointed inside the panel (globals.css), so every
 * `text-paper` below keeps meaning "the readable one" on both of the surfaces
 * this section has.
 *
 * Fields are underlined by a single hairline — no boxes, no capsules — and the
 * label rises out of the field on focus.
 *
 * anime.js drives the copy confirmation and the status message. Both are
 * scroll-independent micro-interactions on nodes GSAP never touches.
 */
export function Contact({ lang, dict }: { lang: Locale; dict: Dictionary }) {
  const [state, formAction] = useActionState(submitContact, INITIAL_CONTACT_STATE);

  return (
    <section
      id="contact"
      data-scheme="ink"
      aria-labelledby="contact-title"
      // No top margin of its own: the panel edge is already the change of
      // subject, and the section padding either side of it was leaving close to
      // half a screen of nothing between the last quote and this heading.
      className="section"
    >
      {/* The colour of the wire, as a layer rather than as the section's own
          background: the cable slides it down the panel as the reader scrolls
          (`FILL_EYE` in CableTrace), and the section underneath stays the unlit
          plate it arrives at. */}
      <div aria-hidden="true" data-panel-fill />

      <div className="shell relative">
        <div data-tap>
          <hr className="hairline" />
          <p className="label pt-4">
            <span className="text-paper tabular-nums">06</span>{" "}
            <span className="ml-3">{dict.contact.eyebrow}</span>
          </p>
        </div>

        <h2
          id="contact-title"
          data-tap
          className="mt-12 max-w-[14ch] font-display text-display-l text-paper"
        >
          {dict.contact.title}
        </h2>

        <div className="grid-editorial pt-16 lg:pt-24">
          <div className="col-span-4 lg:col-span-5">
            <p className="measure font-body text-body-l text-paper" data-tap>
              {dict.contact.lede}
            </p>
            <EmailCopy dict={dict} />
          </div>

          <div className="col-span-4 lg:col-span-6 lg:col-start-7">
            <ContactForm lang={lang} dict={dict} state={state} formAction={formAction} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function EmailCopy({ dict }: { dict: Dictionary }) {
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");
  const badge = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (copied === "idle" || !badge.current) return;
    animate(badge.current, {
      opacity: [0, 1],
      translateY: [6, 0],
      duration: DURATION.micro * 1000,
      ease: "outQuad",
    });
    const id = window.setTimeout(() => setCopied("idle"), 2400);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(IDENTITY.email);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <div className="mt-12" data-tap>
      <p className="label">{dict.contact.emailLabel}</p>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <a
          href={`mailto:${IDENTITY.email}`}
          className="font-display text-display-m text-paper underline decoration-paper/30 underline-offset-[6px] transition-colors duration-200 hover:text-accent-ink hover:decoration-accent-ink"
        >
          {IDENTITY.email}
        </a>
        <button
          type="button"
          onClick={copy}
          className="label text-accent-ink transition-opacity duration-200 hover:opacity-70"
        >
          {dict.contact.copy}
        </button>
      </div>

      {/* Live region so the confirmation is announced, not just seen. */}
      <p aria-live="polite" className="mt-3 min-h-5">
        {copied !== "idle" && (
          <span ref={badge} className="label text-paper">
            {copied === "done" ? dict.contact.copied : dict.contact.copyFailed}
          </span>
        )}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

type FormProps = {
  lang: Locale;
  dict: Dictionary;
  state: ContactState;
  formAction: (formData: FormData) => void;
};

function ContactForm({ lang, dict, state, formAction }: FormProps) {
  const status = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status === "idle" || !status.current) return;
    animate(status.current, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: DURATION.micro * 1000,
      ease: "outQuad",
    });
  }, [state.status, state.message]);

  return (
    <form action={formAction} className="flex flex-col gap-12" data-tap noValidate>
      <input type="hidden" name="lang" value={lang} />

      {/* Honeypot. Hidden from sight and from assistive tech, never focusable. */}
      <div aria-hidden="true" className="absolute h-px w-px overflow-hidden opacity-0">
        <label htmlFor="company">Company</label>
        <input id="company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <Field
        id="name"
        name="name"
        label={dict.contact.form.name}
        autoComplete="name"
        error={state.errors.name}
        defaultValue={state.values.name}
      />
      <Field
        id="email"
        name="email"
        type="email"
        label={dict.contact.form.email}
        autoComplete="email"
        error={state.errors.email}
        defaultValue={state.values.email}
      />
      <Field
        id="message"
        name="message"
        label={dict.contact.form.message}
        multiline
        error={state.errors.message}
        defaultValue={state.values.message}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-6">
        <SubmitButton dict={dict} />
        <p ref={status} aria-live="polite" className="label max-w-[38ch] text-paper">
          {state.message}
        </p>
      </div>
    </form>
  );
}

function SubmitButton({ dict }: { dict: Dictionary }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="label group flex items-baseline gap-3 text-accent-ink transition-opacity duration-200 hover:opacity-70 disabled:opacity-50"
    >
      <span>{pending ? dict.contact.form.sending : dict.contact.form.submit}</span>
      <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
        &rarr;
      </span>
    </button>
  );
}

/**
 * A field is a hairline and a label that gets out of the way. The label rises
 * on focus, and stays risen while the field has content — which is what the
 * empty `placeholder=" "` is for.
 */
function Field({
  id,
  name,
  label,
  type = "text",
  multiline = false,
  autoComplete,
  error,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  multiline?: boolean;
  autoComplete?: string;
  error?: string;
  /** Echoed back by the action, so a rejected submit does not wipe the field. */
  defaultValue?: string;
}) {
  const shared =
    "peer w-full border-b border-paper/25 bg-transparent pt-7 pb-2 font-body text-body-m text-paper outline-none transition-colors duration-200 placeholder:text-transparent focus:border-accent-ink";

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={4}
          placeholder=" "
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${shared} resize-none`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          placeholder=" "
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={shared}
        />
      )}

      <label
        htmlFor={id}
        className="label pointer-events-none absolute top-7 left-0 origin-left transition-all duration-300 peer-focus:top-0 peer-focus:text-accent-ink peer-[&:not(:placeholder-shown)]:top-0"
      >
        {label}
      </label>

      {error ? (
        <p id={`${id}-error`} className="label mt-2 text-paper">
          {error}
        </p>
      ) : null}
    </div>
  );
}
