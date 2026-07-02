import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationName: z
      .string()
      .describe('The name of your Terraform Cloud / HCP Terraform organization'),
    baseUrl: z
      .string()
      .default('https://app.terraform.io/api/v2')
      .describe(
        'API base URL. Use https://app.eu.terraform.io/api/v2 for HCP Europe organizations'
      )
  })
);
