import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    propertyId: z
      .string()
      .optional()
      .describe(
        'Optional GA4 property ID used by property-scoped tools when the tool input does not include propertyId. Accepts "123456789" or "properties/123456789".'
      ),
    measurementId: z
      .string()
      .optional()
      .describe(
        'Optional GA4 web data stream Measurement ID used by Measurement Protocol tools when the tool input does not include measurementId.'
      )
  })
);
