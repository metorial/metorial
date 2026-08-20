import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .enum(['https://api.shipengine.com', 'https://api.eu.shipengine.com'])
        .default('https://api.shipengine.com')
        .describe('ShipEngine API base URL. Use the EU URL for European accounts.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
