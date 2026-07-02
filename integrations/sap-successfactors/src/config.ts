import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiServerUrl: z
      .string()
      .describe(
        'The base URL of your SAP SuccessFactors API instance (e.g., https://apisalesdemo4.successfactors.com)'
      ),
    companyId: z.string().describe('Your SAP SuccessFactors company ID')
  })
);
