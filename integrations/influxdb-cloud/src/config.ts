import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .describe(
        'InfluxDB Cloud region-specific URL (e.g., https://us-east-1-1.aws.cloud2.influxdata.com)'
      ),
    orgId: z.string().describe('InfluxDB organization ID')
  })
);
