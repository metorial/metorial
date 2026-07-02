import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe(
        'Your Freshsales domain or bundle alias (e.g. "mycompany" from mycompany.myfreshworks.com or mycompany.freshsales.io)'
      ),
    apiVersion: z
      .enum(['freshworks', 'classic'])
      .default('freshworks')
      .describe(
        'API version: "freshworks" for myfreshworks.com or "classic" for freshsales.io'
      )
  })
);
