import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z
        .enum(['v2', 'v1'])
        .default('v2')
        .describe(
          'API version to use. "v2" uses the new Forminit API (api.forminit.com). "v1" uses the legacy Getform API (api.getform.io).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
