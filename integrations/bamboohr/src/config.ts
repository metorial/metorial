import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    companyDomain: z
      .string()
      .describe(
        'Your BambooHR company subdomain (e.g., if you access https://mycompany.bamboohr.com, enter "mycompany")'
      )
  })
);
