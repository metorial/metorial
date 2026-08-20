import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceUrl: {
      schema: z
        .string()
        .describe(
          'Databricks workspace URL (e.g., https://adb-1234567890123456.7.azuredatabricks.net)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
