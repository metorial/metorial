import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    storageRegion: {
      schema: z
        .enum(['default', 'ny', 'la', 'uk', 'sg', 'syd', 'se', 'br', 'jh'])
        .default('default')
        .describe(
          'Primary region for Edge Storage API. Determines the storage API endpoint hostname.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
