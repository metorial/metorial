import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .describe('Your Sanity project ID. Found in your project settings at sanity.io/manage.'),
    dataset: z
      .string()
      .default('production')
      .describe('The dataset name to operate on (e.g., "production", "staging").'),
    apiVersion: z
      .string()
      .default('2024-01-01')
      .describe(
        'API version date string (e.g., "2024-01-01"). Determines API behavior and response format.'
      )
  })
);
