import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe('Your Okta organization domain, e.g. https://dev-123456.okta.com')
  })
);
