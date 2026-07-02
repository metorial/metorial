import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'self-hosted'])
      .default('us')
      .describe('PostHog cloud region or self-hosted'),
    instanceUrl: z
      .string()
      .optional()
      .describe(
        'Custom instance URL for self-hosted PostHog (e.g. https://posthog.example.com). Required when region is self-hosted.'
      ),
    projectId: z
      .string()
      .optional()
      .describe('PostHog project ID. Required for most private API endpoints.')
  })
);
