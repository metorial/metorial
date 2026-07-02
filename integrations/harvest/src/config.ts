import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe('Your Harvest Account ID. Found at https://id.getharvest.com/developers')
  })
);
