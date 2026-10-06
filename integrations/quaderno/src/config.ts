import { SlateConfig } from 'slates';
import { z } from 'zod';
export const config = SlateConfig.create(
  z.object({
    accountName: z
      .string()
      .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/)
      .optional()
      .describe(
        'Account subdomain from get_current_account for older connections. New connections discover it automatically.'
      )
  })
);
