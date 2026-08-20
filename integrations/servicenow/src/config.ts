import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceName: {
      schema: z
        .string()
        .describe(
          'The ServiceNow instance name (subdomain). For example, if your instance URL is https://mycompany.service-now.com, enter "mycompany".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
