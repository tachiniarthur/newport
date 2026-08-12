/**
 * Shape of the contact form's result, shared by the Server Action and the
 * client form.
 *
 * This lives outside the action module because a `"use server"` file may only
 * export async functions — a type and a constant would be a build error there.
 */

export type ContactValues = { name: string; email: string; message: string };

export type ContactState = {
  status: "idle" | "success" | "error" | "notConfigured";
  errors: Partial<Record<"name" | "email" | "message", string>>;
  message: string | null;
  /**
   * What the visitor typed, echoed back.
   *
   * React resets a form once its action resolves, so without this a rejected
   * submission would wipe the message someone just wrote — the worst possible
   * moment to lose it. The fields read these back as `defaultValue`, which is
   * what the reset restores to. Cleared on success so the form empties.
   */
  values: ContactValues;
};

export const EMPTY_CONTACT_VALUES: ContactValues = { name: "", email: "", message: "" };

export const INITIAL_CONTACT_STATE: ContactState = {
  status: "idle",
  errors: {},
  message: null,
  values: EMPTY_CONTACT_VALUES,
};
