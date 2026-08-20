import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationName: {
      schema: z
        .string()
        .describe('The name of your Terraform Cloud / HCP Terraform organization'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    baseUrl: {
      schema: z
        .string()
        .default('https://app.terraform.io/api/v2')
        .describe(
          'API base URL. Use https://app.eu.terraform.io/api/v2 for HCP Europe organizations'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
