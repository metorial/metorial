import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .enum(['https://api.shipengine.com', 'https://api.eu.shipengine.com'])
      .default('https://api.shipengine.com')
      .describe('ShipEngine API base URL. Use the EU URL for European accounts.')
  })
);
