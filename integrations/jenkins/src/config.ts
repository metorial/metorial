import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe('The base URL of the Jenkins instance (e.g. https://jenkins.example.com)')
  })
);
