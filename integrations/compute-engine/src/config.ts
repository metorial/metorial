import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .trim()
        .min(1)
        .describe('Google Cloud project ID used for Compute Engine API requests'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultZone: {
      schema: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Default Compute Engine zone, for example us-central1-a'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultRegion: {
      schema: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Default Compute Engine region, for example us-central1'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
