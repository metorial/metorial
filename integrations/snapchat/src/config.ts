import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    adAccountId: z
      .string()
      .optional()
      .describe('Default ad account ID used by triggers for monitoring campaigns and ads'),
    adSquadId: z
      .string()
      .optional()
      .describe('Default ad squad ID used by the ad updates trigger')
  })
);
