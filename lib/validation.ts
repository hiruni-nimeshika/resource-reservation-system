import { z } from "zod";

const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} must be ${max} characters or fewer.`);

const optionalText = (max: number) =>
  z.string().trim().max(max, `Must be ${max} characters or fewer.`).transform((v) => v || null);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z.object({
  name: text("Name", 80),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(8, "Password must be at least 8 characters.").max(100, "Password is too long."),
});

export const bookingSchema = z.object({
  resourceId: z.uuid("Unknown resource."),
  title: text("A title", 100),
  notes: optionalText(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose an end time."),
});

export const resourceSchema = z.object({
  name: text("Name", 80),
  categoryId: z.uuid("Choose a category."),
  location: optionalText(120),
  description: optionalText(500),
  capacity: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number().int("Capacity must be a whole number.").positive("Capacity must be at least 1.").max(10000).nullable()),
});

export const firstError = (error: z.ZodError) => error.issues[0]?.message ?? "Please check the form.";
export const formString = (formData: FormData, key: string) => String(formData.get(key) ?? "");

/** Values to re-fill a form with after a failed submit (React 19 resets uncontrolled forms after every action). Never includes passwords. */
export function submittedValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$") && !key.toLowerCase().includes("password")) out[key] = value;
  }
  return out;
}
