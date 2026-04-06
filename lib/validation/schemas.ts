import { z } from "zod";

export const tokenSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or less")
    .regex(/^[a-zA-Z0-9 \-]+$/, "Name can only contain letters, numbers, spaces, and hyphens"),
  symbol: z
    .string()
    .min(1, "Symbol is required")
    .max(10, "Symbol must be 10 characters or less")
    .regex(/^[A-Z0-9]+$/, "Symbol must be uppercase letters and numbers only"),
  initialSupply: z
    .number({ error: "Supply must be a number" })
    .int("Supply must be a whole number")
    .min(1, "Supply must be at least 1")
    .max(1_000_000_000, "Supply cannot exceed 1 billion"),
  decimals: z.union([z.literal(6), z.literal(8), z.literal(18)]),
  confirmed: z.literal(true, {
    error: "You must confirm before deploying",
  }),
});

export type TokenFormData = z.infer<typeof tokenSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupFormData = z.infer<typeof signupSchema>;
