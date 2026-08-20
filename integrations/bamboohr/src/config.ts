import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    companyDomain: {
      schema: z
        .string()
        .describe(
          'Your BambooHR company subdomain (e.g., if you access https://mycompany.bamboohr.com, enter "mycompany")'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
