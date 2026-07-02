import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    storageRegion: z
      .enum(['default', 'ny', 'la', 'uk', 'sg', 'syd', 'se', 'br', 'jh'])
      .default('default')
      .describe(
        'Primary region for Edge Storage API. Determines the storage API endpoint hostname.'
      )
  })
);
