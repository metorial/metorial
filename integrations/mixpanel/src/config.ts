import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    dataResidency: z
      .enum(['us', 'eu', 'in'])
      .default('us')
      .describe('Data residency region. Use "eu" for EU projects or "in" for India projects.'),
    projectId: z.string().describe('Mixpanel project ID, found in Project Settings.')
  })
);
