import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .trim()
      .min(1)
      .describe('Google Cloud project ID used for Compute Engine API requests'),
    defaultZone: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Default Compute Engine zone, for example us-central1-a'),
    defaultRegion: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Default Compute Engine region, for example us-central1')
  })
);
