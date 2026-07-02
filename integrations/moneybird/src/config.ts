import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    administrationId: z
      .string()
      .describe(
        'The Moneybird administration ID. Found in the URL when logged into Moneybird (e.g., https://moneybird.com/{administrationId}/).'
      )
  })
);
