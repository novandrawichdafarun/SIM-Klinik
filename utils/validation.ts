import { ZodType } from "zod";

export function validateFormData<T>(
  formData: FormData,
  schema: ZodType<T>,
): { data?: T; error?: string } {
  const rawData = Object.fromEntries(formData.entries());
  const validation = schema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  return { data: validation.data };
}
