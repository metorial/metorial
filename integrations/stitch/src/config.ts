import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'Data pipeline region. "us" uses api.stitchdata.com, "eu" uses api.eu-central-1.stitchdata.com.'
      ),
    clientId: z
      .string()
      .optional()
      .describe(
        'Stitch client ID (found in your Stitch dashboard URL). Required for Import API operations and extraction/load monitoring.'
      )
  })
);
