import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiSurface: {
      schema: z
        .enum(['playground', 'studio'])
        .default('playground')
        .describe(
          'Which Gan.AI API surface to use. "playground" uses os.gan.ai for TTS, avatars, lip-sync, and sound effects. "studio" uses api.gan.ai for personalized video campaigns.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
