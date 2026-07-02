import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe('Cloudflare Account ID. Found in the Cloudflare dashboard under Account Home.')
  })
);
