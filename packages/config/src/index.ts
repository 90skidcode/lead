import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  POWERSYNC_URL: z.string().url(),
  POWERSYNC_TOKEN_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  INNGEST_EVENT_KEY: z.string(),
  INNGEST_SIGNING_KEY: z.string(),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

function validateEnv() {
  const env = process.env;
  const result = envSchema.safeParse(env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    result.error.errors.forEach((error) => {
      console.error(`  ${error.path.join('.')}: ${error.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

let cachedConfig: z.infer<typeof envSchema> | null = null;

export function getConfig() {
  if (!cachedConfig) {
    cachedConfig = validateEnv();
  }
  return cachedConfig;
}

export const config = getConfig();
export type Config = typeof config;
