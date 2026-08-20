import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountName: {
      schema: z
        .string()
        .describe(
          'Your DeployHQ account name (subdomain). This is the part before .deployhq.com in your account URL.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
