import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    appId: {
      schema: z
        .string()
        .describe(
          'Your AppDrag App ID. Found in the top-left corner of the CloudBackend Portal.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
