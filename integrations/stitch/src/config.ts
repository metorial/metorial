import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe(
          'Data pipeline region. "us" uses api.stitchdata.com, "eu" uses api.eu-central-1.stitchdata.com.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    clientId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Stitch client ID (found in your Stitch dashboard URL). Required for Import API operations and extraction/load monitoring.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
