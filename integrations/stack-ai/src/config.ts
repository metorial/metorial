import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    orgId: z
      .string()
      .describe('Your Stack AI organization ID. Found in your account settings or URL.')
  })
);
