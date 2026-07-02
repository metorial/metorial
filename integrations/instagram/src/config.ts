import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .string()
      .default('v21.0')
      .describe('Instagram Graph API version (e.g. v21.0)')
  })
);
