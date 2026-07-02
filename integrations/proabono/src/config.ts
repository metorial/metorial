import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiEndpoint: z
      .string()
      .describe('ProAbono API endpoint URL (e.g., https://api-1.proabono.com)'),
    defaultSegment: z
      .string()
      .optional()
      .describe('Default ReferenceSegment to use when not specified per request')
  })
);
