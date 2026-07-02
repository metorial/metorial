import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    orgId: z
      .string()
      .optional()
      .describe(
        'Organization ID for multi-tenant (MSP) environments. Required if managing multiple JumpCloud organizations.'
      )
  })
);
