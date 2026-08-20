import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiEndpoint: {
      schema: z
        .string()
        .describe('ProAbono API endpoint URL (e.g., https://api-1.proabono.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultSegment: {
      schema: z
        .string()
        .optional()
        .describe('Default ReferenceSegment to use when not specified per request'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
