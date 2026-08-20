import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z
        .enum(['v1beta', 'v1'])
        .default('v1beta')
        .describe('Gemini API version to use. v1beta provides access to the latest features.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
