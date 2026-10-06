import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['auto', 'eu', 'uk', 'us', 'ca', 'as', 'au', 'jp'])
      .default('auto')
      .describe(
        'Processing server region. Use auto for GEO DNS routing, or choose a documented regional server. Region selection does not establish legal compliance.'
      )
  })
);
