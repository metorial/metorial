import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    localityLanguage: {
      schema: z
        .string()
        .default('en')
        .describe(
          'Preferred language for locality names in ISO 639-1 format (e.g. "en", "es", "fr"). Defaults to "en".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
