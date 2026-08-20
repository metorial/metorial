import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    locationSlug: {
      schema: z
        .string()
        .optional()
        .describe(
          'Datacenter location slug (e.g., "tll01", "jhvi", "jhv02"). If not set, the default location is used.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
