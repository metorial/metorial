import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .enum(['v1beta', 'v1'])
      .default('v1beta')
      .describe('Gemini API version to use. v1beta provides access to the latest features.')
  })
);
