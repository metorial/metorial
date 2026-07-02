import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    sport: z
      .enum([
        'football',
        'basketball',
        'baseball',
        'hockey',
        'rugby',
        'handball',
        'volleyball',
        'afl',
        'nba',
        'nfl',
        'formula-1',
        'mma'
      ])
      .default('football')
      .describe('The sport API to use as the default for requests')
  })
);
