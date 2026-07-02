import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountName: z
      .string()
      .describe(
        'Your DeployHQ account name (subdomain). This is the part before .deployhq.com in your account URL.'
      )
  })
);
