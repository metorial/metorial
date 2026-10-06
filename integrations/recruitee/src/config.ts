import { SlateConfig } from 'slates';
import { z } from 'zod';
export let config = SlateConfig.create(
  z.object({
    companySubdomain: z
      .string()
      .optional()
      .describe(
        'Company subdomain from your Recruitee sign-in or careers address, for example acme from acme.recruitee.com. Use this for new connections; do not enter a full URL.'
      ),
    companyId: z
      .string()
      .optional()
      .describe(
        'Optional legacy Company ID retained for existing stored connections. New setup uses companySubdomain and discovers the exact company through current identity.'
      )
  })
);
