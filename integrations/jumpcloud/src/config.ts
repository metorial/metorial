import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    orgId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Organization ID for multi-tenant (MSP) environments. Required if managing multiple JumpCloud organizations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
