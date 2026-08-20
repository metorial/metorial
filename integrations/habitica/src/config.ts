import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    xClient: {
      schema: z
        .string()
        .describe(
          'x-client header value in the format "CreatorUserID-AppName" to identify your tool to Habitica servers'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
