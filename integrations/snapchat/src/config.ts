import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    adAccountId: {
      schema: z
        .string()
        .optional()
        .describe('Default ad account ID used by triggers for monitoring campaigns and ads'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    adSquadId: {
      schema: z
        .string()
        .optional()
        .describe('Default ad squad ID used by the ad updates trigger'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
