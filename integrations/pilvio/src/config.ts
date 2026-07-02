import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    locationSlug: z
      .string()
      .optional()
      .describe(
        'Datacenter location slug (e.g., "tll01", "jhvi", "jhv02"). If not set, the default location is used.'
      )
  })
);
