import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    xSystem: {
      schema: z
        .string()
        .describe('Your registered X-System header value for Follow Up Boss API'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    xSystemKey: {
      schema: z
        .string()
        .describe('Your registered X-System-Key header value for Follow Up Boss API'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
