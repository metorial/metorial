import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationSlug: z
      .string()
      .describe('The slug of the Sentry organization to interact with'),
    region: z.enum(['us', 'de']).default('us').describe('The Sentry data region (US or EU/DE)')
  })
);
