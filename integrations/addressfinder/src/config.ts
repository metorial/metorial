import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    defaultCountry: {
      schema: z
        .enum(['au', 'nz'])
        .default('nz')
        .describe('Default country for address operations (AU or NZ)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
