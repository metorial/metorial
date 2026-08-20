import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z
        .string()
        .describe(
          'Your Sendspark Workspace ID, found in the API Credentials tab at https://sendspark.com/settings/api-credentials'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
