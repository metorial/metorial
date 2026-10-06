import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    endpointCompatibility: z
      .enum(['current', 'legacy'])
      .optional()
      .describe(
        'Defaults to current endpoints for new Development Mode apps. Select legacy only after confirming this application has access to the requested older endpoints through Extended Quota or retained access; no entitlement is detected automatically.'
      ),
    market: z
      .string()
      .optional()
      .describe(
        'ISO 3166-1 alpha-2 country code for filtering content availability (e.g., "US", "GB", "DE")'
      )
  })
);
