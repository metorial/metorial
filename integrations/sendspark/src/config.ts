import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z
      .string()
      .describe(
        'Your Sendspark Workspace ID, found in the API Credentials tab at https://sendspark.com/settings/api-credentials'
      )
  })
);
