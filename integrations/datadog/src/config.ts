import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    site: {
      schema: z
        .enum([
          'datadoghq.com',
          'us3.datadoghq.com',
          'us5.datadoghq.com',
          'datadoghq.eu',
          'ap1.datadoghq.com',
          'ap2.datadoghq.com',
          'ddog-gov.com'
        ])
        .default('datadoghq.com')
        .describe('Datadog site/region for your account. Determines the API base URL.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
