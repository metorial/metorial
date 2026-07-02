import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    selectedCustomerNo: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Default Visma.net customer ID used for company discovery.'),
    selectedCompanyNo: z
      .number()
      .int()
      .positive()
      .optional()
      .describe('Default Visma.net company ID used by company-scoped tools.'),
    defaultPageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Default number of rows to request for paginated table queries.')
  })
);
