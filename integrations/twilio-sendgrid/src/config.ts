import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['global', 'eu'])
      .default('global')
      .describe('SendGrid API region. Use "eu" for EU-hosted accounts.')
  })
);
