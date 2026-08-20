import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiServerUrl: {
      schema: z
        .string()
        .describe(
          'The base URL of your SAP SuccessFactors API instance (e.g., https://apisalesdemo4.successfactors.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    companyId: {
      schema: z.string().describe('Your SAP SuccessFactors company ID'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
