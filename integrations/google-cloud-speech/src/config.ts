import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z.string().describe('Google Cloud project ID'),
    region: z
      .string()
      .default('global')
      .describe(
        'Speech-to-Text v2 location. `global` is the safest default for recognizers and inline transcription. Regional locations may be available for specific projects or models.'
      )
  })
);
