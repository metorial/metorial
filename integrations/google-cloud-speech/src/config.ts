import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z.string().describe('Google Cloud project ID'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .string()
        .default('global')
        .describe(
          'Speech-to-Text v2 location. `global` is the safest default for recognizers and inline transcription. Regional locations may be available for specific projects or models.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
