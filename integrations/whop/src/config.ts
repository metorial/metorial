import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    companyId: z
      .string()
      .optional()
      .describe(
        'Default Whop company/account ID (e.g. biz_xxxxx). Optional: call list_accounts and pass its accountId as companyId to each tool.'
      )
  })
);
