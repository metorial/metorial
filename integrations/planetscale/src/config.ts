import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organization: {
      schema: z
        .string()
        .describe('PlanetScale organization name (slug) used for all API requests'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
