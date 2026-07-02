import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    sandbox: z
      .boolean()
      .default(false)
      .describe('Use the Evernote sandbox environment instead of production')
  })
);
