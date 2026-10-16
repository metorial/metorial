import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
      baseUrl: z
        .string()
        .describe(
          'InfluxDB Cloud TSM region URL or an InfluxDB 2 instance URL. Preserve any configured proxy path.'
        )
    })
    .passthrough()
);
