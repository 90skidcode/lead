import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  passwordConfirm: z.string(),
  tenantName: z.string().min(1, 'Tenant name is required'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ['passwordConfirm'],
});

export type SignupInput = z.infer<typeof signupSchema>;

export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'SALES_REP', 'VIEWER']),
  teamId: z.string().uuid().optional(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const createTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required'),
  slug: z.string().min(1, 'Slug is required').toLowerCase(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
