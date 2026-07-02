import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    host: z
      .string()
      .describe('Splunk instance hostname or IP address (e.g. "splunk.example.com")'),
    managementPort: z
      .string()
      .default('8089')
      .describe('Management REST API port (default: 8089)'),
    hecPort: z.string().default('8088').describe('HTTP Event Collector port (default: 8088)'),
    scheme: z
      .enum(['https', 'http'])
      .default('https')
      .describe(
        'Connection scheme. HTTPS is strongly recommended and required for Splunk Cloud.'
      )
  })
);
