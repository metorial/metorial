import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organization: z
      .string()
      .describe('Azure DevOps organization name (e.g., "myorg" for dev.azure.com/myorg)'),
    project: z.string().describe('Azure DevOps team project name or ID')
  })
);
