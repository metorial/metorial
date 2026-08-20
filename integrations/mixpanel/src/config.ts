import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    dataResidency: {
      schema: z
        .enum(['us', 'eu', 'in'])
        .default('us')
        .describe(
          'Data residency region. Use "eu" for EU projects or "in" for India projects.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    projectId: {
      schema: z.string().describe('Mixpanel project ID, found in Project Settings.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
