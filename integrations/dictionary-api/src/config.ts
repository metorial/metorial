import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    languageCode: {
      schema: z
        .string()
        .default('en')
        .describe(
          'Language code for dictionary lookups (e.g., "en" for English, "fr" for French)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
