import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe(
          'Your MemberVault account subdomain. For example, if your URL is https://mybusiness.vipmembervault.com or https://mybusiness.mvsite.app, the subdomain is "mybusiness".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
