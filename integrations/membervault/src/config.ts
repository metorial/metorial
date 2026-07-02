import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .describe(
        'Your MemberVault account subdomain. For example, if your URL is https://mybusiness.vipmembervault.com or https://mybusiness.mvsite.app, the subdomain is "mybusiness".'
      )
  })
);
