import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    defaultCountry: z
      .enum(['au', 'nz'])
      .default('nz')
      .describe('Default country for address operations (AU or NZ)')
  })
);
