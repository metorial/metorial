import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z.string().describe('The Clockify workspace ID to operate on'),
    dataRegion: z
      .enum(['global', 'euc1', 'use2', 'euw2', 'apse2'])
      .default('global')
      .describe(
        'Data region for the Clockify API. Use "global" for the default region, or select a specific region (euc1=EU/Germany, use2=USA, euw2=UK, apse2=AU)'
      )
  })
);
