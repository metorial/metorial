import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiHost: z
      .string()
      .describe(
        'Your Whautomate API hostname (e.g. api.whautomate.com or api.in.whautomate.com). Find this in Integrations → REST API in your Whautomate account.'
      )
  })
);
