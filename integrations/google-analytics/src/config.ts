import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    propertyId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional GA4 property ID used by property-scoped tools when the tool input does not include propertyId. Accepts "123456789" or "properties/123456789".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    measurementId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional GA4 web data stream Measurement ID used by Measurement Protocol tools when the tool input does not include measurementId.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
