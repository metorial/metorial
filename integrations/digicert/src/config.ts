import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    platform: z
      .enum(['certcentral', 'certcentral_eu'])
      .default('certcentral')
      .describe(
        'DigiCert platform instance. Use certcentral_eu only if your console shows "CertCentral Europe" in the top left corner.'
      )
  })
);
