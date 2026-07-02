import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .describe(
        'FreshBooks account ID. Found in the /me endpoint response under business_memberships. Required for accounting API calls (invoices, clients, expenses, payments, etc.).'
      ),
    businessId: z
      .string()
      .optional()
      .describe(
        'FreshBooks business ID. Found in the /me endpoint response under business_memberships. Required for projects and time tracking API calls. If not provided, will default to the business associated with the accountId.'
      )
  })
);
