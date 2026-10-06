import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    sandbox: z
      .boolean()
      .default(false)
      .describe(
        'Use artificial person/company data without credits on documented sandbox endpoints. Other operations fail without switching to production.'
      )
  })
);
