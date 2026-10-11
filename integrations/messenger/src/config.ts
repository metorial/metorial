import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let MESSENGER_DEFAULT_API_VERSION = 'v24.0';

export let config = SlateConfig.create(
  z.object({
    pageId: z
      .string()
      .optional()
      .describe(
        'Optional Facebook Page ID, used only when the connection does not record its Page. Leave empty for new connections.'
      ),
    apiVersion: z
      .string()
      .default(MESSENGER_DEFAULT_API_VERSION)
      .describe('Graph API version to use (e.g. v24.0)')
  })
);
