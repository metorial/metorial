import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    attachmentServerUrl: z
      .string()
      .url()
      .describe('Base URL of the deployed attachment URL test helper.')
  })
);
