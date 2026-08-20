import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z.string().describe('The Clockify workspace ID to operate on'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    dataRegion: {
      schema: z
        .enum(['global', 'euc1', 'use2', 'euw2', 'apse2'])
        .default('global')
        .describe(
          'Data region for the Clockify API. Use "global" for the default region, or select a specific region (euc1=EU/Germany, use2=USA, euw2=UK, apse2=AU)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
