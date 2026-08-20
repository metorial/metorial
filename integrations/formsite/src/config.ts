import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    server: {
      schema: z
        .string()
        .describe(
          'Server prefix your account is hosted on (e.g., fs1, fs18). Found on the Formsite API settings page.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    userDir: {
      schema: z
        .string()
        .describe(
          'Your account directory identifier, same as used in your form links. Found on the Formsite API settings page.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
