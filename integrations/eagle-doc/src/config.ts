import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://de.eagle-doc.com')
        .describe(
          'Base URL for the Eagle Doc API. Default is the Frankfurt (Germany) instance.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
