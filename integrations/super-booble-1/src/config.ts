import { SlateConfig } from 'slates';
import { z } from 'zod';

export let superGoogle1ConfigSchema = z.object({
  userId: z
    .string()
    .default('me')
    .describe(
      'Gmail user ID. Use "me" for the authenticated user, or specify a full email address for delegated access.'
    ),
  defaultSpace: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Default Google Chat space ID or resource name (spaces/{space}).')
});

export type SuperGoogle1Config = z.infer<typeof superGoogle1ConfigSchema>;

export let config = SlateConfig.create(superGoogle1ConfigSchema);
