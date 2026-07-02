import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let MESSENGER_DEFAULT_API_VERSION = 'v24.0';

export let config = SlateConfig.create(
  z.object({
    pageId: z.string().describe('The Facebook Page ID to use for Messenger API calls'),
    apiVersion: z
      .string()
      .default(MESSENGER_DEFAULT_API_VERSION)
      .describe('Graph API version to use (e.g. v24.0)')
  })
);
