import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organization: z
      .string()
      .describe('PlanetScale organization name (slug) used for all API requests')
  })
);
