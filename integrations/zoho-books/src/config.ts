import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .describe('The Zoho Books organization ID. Required for all API requests.'),
    region: z
      .enum(['.com', '.eu', '.in', '.com.au', '.jp', '.ca', '.com.cn', '.sa'])
      .default('.com')
      .describe('The Zoho region domain suffix for your account (e.g. ".com", ".eu", ".in").')
  })
);
