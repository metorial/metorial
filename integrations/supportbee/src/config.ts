import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    companySubdomain: z
      .string()
      .describe(
        'Your SupportBee company subdomain. For example, if your account URL is https://xyz.supportbee.com, enter "xyz".'
      )
  })
);
