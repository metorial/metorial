import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    sport: {
      schema: z
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
        .describe('The sport API to use as the default for requests'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
