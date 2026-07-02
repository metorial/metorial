import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe(
        'Your Mailtrap account ID. Found in the Mailtrap dashboard URL or account settings.'
      )
  })
);
