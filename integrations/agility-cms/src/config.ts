import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    guid: {
      schema: z
        .string()
        .describe(
          'Your Agility CMS instance GUID (e.g., "e13c7b01-u"). Found in Settings > API Keys.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    locale: {
      schema: z
        .string()
        .default('en-us')
        .describe('Default locale code for content operations (e.g., "en-us", "fr-ca").'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
