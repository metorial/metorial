import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    xClient: z
      .string()
      .describe(
        'x-client header value in the format "CreatorUserID-AppName" to identify your tool to Habitica servers'
      )
  })
);
