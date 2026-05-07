import { z } from "zod";

export const subscriptionSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(60, "Máximo 60 caracteres"),
  description: z.string().max(200).optional().or(z.literal("")),
  url: z
    .string()
    .url("Introduce una URL válida (ej: https://netflix.com)")
    .optional()
    .or(z.literal("")),
  logo_url: z.string().url().optional().or(z.literal("")),
  price: z
    .number({ invalid_type_error: "El precio debe ser un número" })
    .positive("El precio debe ser mayor que 0")
    .max(99999, "Precio máximo excedido"),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  billing_cycle: z
    .enum(["monthly", "yearly", "weekly", "quarterly"])
    .default("monthly"),
  next_billing_date: z
    .string()
    .min(1, "Selecciona la próxima fecha de cobro"),
  category_id: z.string().uuid().optional().or(z.literal("")),
  notify_days_before: z.number().int().min(0).max(30).default(3),
  used_this_month: z.boolean().default(false),
});

export type SubscriptionFormValues = z.infer<typeof subscriptionSchema>;

// Simplified schema for Chrome Extension API endpoint
export const addSubApiSchema = z.object({
  name: z.string().min(1).max(60),
  price: z.number().positive().optional(),
  url: z.string().url().optional(),
  billing_cycle: z
    .enum(["monthly", "yearly", "weekly", "quarterly"])
    .optional()
    .default("monthly"),
  currency: z.enum(["EUR", "USD", "GBP"]).optional().default("EUR"),
});

export type AddSubApiPayload = z.infer<typeof addSubApiSchema>;
