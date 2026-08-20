import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe(
          'InfluxDB Cloud region-specific URL (e.g., https://us-east-1-1.aws.cloud2.influxdata.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    orgId: {
      schema: z.string().describe('InfluxDB organization ID'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
