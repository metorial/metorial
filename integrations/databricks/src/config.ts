import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceUrl: z
      .string()
      .describe(
        'Databricks workspace URL (e.g., https://adb-1234567890123456.7.azuredatabricks.net)'
      )
  })
);
