import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    xSystem: z
      .string()
      .describe('Your registered X-System header value for Follow Up Boss API'),
    xSystemKey: z
      .string()
      .describe('Your registered X-System-Key header value for Follow Up Boss API')
  })
);
