const { z } = require("zod");

const registerSchema = z.object({
  //transform=>database not treat case diffrent as seprate users
  email: z
    .email("Please enter a valid email address")
    .transform((val) => val.toLowerCase()),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

const loginSchema = z.object({
  email: z
    .email("Please enter a valid email address")
    .transform((val) => val.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

module.exports = {
  registerSchema,
  loginSchema,
};
