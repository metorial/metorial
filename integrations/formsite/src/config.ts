import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    server: z
      .string()
      .describe(
        'Server prefix your account is hosted on (e.g., fs1, fs18). Found on the Formsite API settings page.'
      ),
    userDir: z
      .string()
      .describe(
        'Your account directory identifier, same as used in your form links. Found on the Formsite API settings page.'
      )
  })
);
