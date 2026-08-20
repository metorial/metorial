import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let MESSENGER_DEFAULT_API_VERSION = 'v24.0';

export let config = configV2({
  fields: {
    pageId: {
      schema: z.string().describe('The Facebook Page ID to use for Messenger API calls'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiVersion: {
      schema: z
        .string()
        .default(MESSENGER_DEFAULT_API_VERSION)
        .describe('Graph API version to use (e.g. v24.0)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
