import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    appId: z
      .string()
      .describe(
        'Your AppDrag App ID. Found in the top-left corner of the CloudBackend Portal.'
      )
  })
);
