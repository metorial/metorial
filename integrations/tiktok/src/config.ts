import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiType: {
      schema: z
        .enum(['consumer', 'business'])
        .default('consumer')
        .describe(
          'Which TikTok API ecosystem to use. "consumer" for TikTok for Developers (login, content posting, video display). "business" for TikTok API for Business (advertising, campaign management).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
