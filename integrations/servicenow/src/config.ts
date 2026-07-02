import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceName: z
      .string()
      .describe(
        'The ServiceNow instance name (subdomain). For example, if your instance URL is https://mycompany.service-now.com, enter "mycompany".'
      )
  })
);
