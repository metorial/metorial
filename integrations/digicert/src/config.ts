import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    platform: {
      schema: z
        .enum(['certcentral', 'certcentral_eu'])
        .default('certcentral')
        .describe(
          'DigiCert platform instance. Use certcentral_eu only if your console shows "CertCentral Europe" in the top left corner.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
