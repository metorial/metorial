import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    dataResidency: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'Data residency region. Use "eu" if your Mixpanel project stores data in the EU.'
      ),
    projectId: z.string().describe('Mixpanel project ID, found in Project Settings.')
  })
);
