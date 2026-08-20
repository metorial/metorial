import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiHost: {
      schema: z
        .string()
        .describe(
          'Your Whautomate API hostname (e.g. api.whautomate.com or api.in.whautomate.com). Find this in Integrations → REST API in your Whautomate account.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
