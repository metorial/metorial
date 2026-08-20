import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    selectedCustomerNo: {
      schema: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Default Visma.net customer ID used for company discovery.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    selectedCompanyNo: {
      schema: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Default Visma.net company ID used by company-scoped tools.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultPageSize: {
      schema: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Default number of rows to request for paginated table queries.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
