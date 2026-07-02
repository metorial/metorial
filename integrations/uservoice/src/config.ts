import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe('Your UserVoice subdomain (e.g., "mycompany" for mycompany.uservoice.com)')
  })
);
