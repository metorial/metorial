import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .describe('Base URL of the Gitea instance, e.g. https://gitea.example.com'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
