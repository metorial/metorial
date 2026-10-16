import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    locationSlug: z
      .string()
      .optional()
      .describe(
        'Datacenter location slug. Call list_platform_config with resource="locations" to discover available locations. If omitted, the default location is used.'
      )
  })
);
