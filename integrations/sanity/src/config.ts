import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .describe(
          'Your Sanity project ID. Found in your project settings at sanity.io/manage.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    dataset: {
      schema: z
        .string()
        .default('production')
        .describe('The dataset name to operate on (e.g., "production", "staging").'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiVersion: {
      schema: z
        .string()
        .default('2024-01-01')
        .describe(
          'API version date string (e.g., "2024-01-01"). Determines API behavior and response format.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
