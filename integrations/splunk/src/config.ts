import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    host: {
      schema: z
        .string()
        .describe('Splunk instance hostname or IP address (e.g. "splunk.example.com")'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    managementPort: {
      schema: z.string().default('8089').describe('Management REST API port (default: 8089)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    hecPort: {
      schema: z.string().default('8088').describe('HTTP Event Collector port (default: 8088)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    scheme: {
      schema: z
        .enum(['https', 'http'])
        .default('https')
        .describe(
          'Connection scheme. HTTPS is strongly recommended and required for Splunk Cloud.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
