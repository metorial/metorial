import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    guid: z
      .string()
      .describe(
        'Your Agility CMS instance GUID (e.g., "e13c7b01-u"). Found in Settings > API Keys.'
      ),
    locale: z
      .string()
      .default('en-us')
      .describe('Default locale code for content operations (e.g., "en-us", "fr-ca").')
  })
);
