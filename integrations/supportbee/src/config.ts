import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    companySubdomain: {
      schema: z
        .string()
        .describe(
          'Your SupportBee company subdomain. For example, if your account URL is https://xyz.supportbee.com, enter "xyz".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
