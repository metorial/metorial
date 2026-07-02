import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    accountId: z
      .string()
      .optional()
      .describe(
        'Optional dbt Cloud account ID. If omitted, account-scoped tools use the token directly when it can access exactly one account on the configured base URL. For multi-account tokens, call List Accounts and pass the selected accountId to the tool.'
      ),
    baseUrl: z
      .string()
      .default('https://cloud.getdbt.com')
      .describe(
        'Base URL for your dbt Cloud instance. Defaults to US multi-tenant (https://cloud.getdbt.com). Use https://emea.dbt.com for EMEA, https://au.dbt.com for APAC, or your custom URL for single-tenant deployments.'
      )
  })
);
