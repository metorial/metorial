import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe(
          'Your Freshsales domain or bundle alias (e.g. "mycompany" from mycompany.myfreshworks.com or mycompany.freshsales.io)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiVersion: {
      schema: z
        .enum(['freshworks', 'classic'])
        .default('freshworks')
        .describe(
          'API version: "freshworks" for myfreshworks.com or "classic" for freshsales.io'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
