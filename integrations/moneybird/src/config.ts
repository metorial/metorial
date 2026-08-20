import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    administrationId: {
      schema: z
        .string()
        .describe(
          'The Moneybird administration ID. Found in the URL when logged into Moneybird (e.g., https://moneybird.com/{administrationId}/).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
