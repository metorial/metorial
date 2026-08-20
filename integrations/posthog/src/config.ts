import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu', 'self-hosted'])
        .default('us')
        .describe('PostHog cloud region or self-hosted'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    instanceUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'Custom instance URL for self-hosted PostHog (e.g. https://posthog.example.com). Required when region is self-hosted.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    projectId: {
      schema: z
        .string()
        .optional()
        .describe('PostHog project ID. Required for most private API endpoints.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
