import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationSlug: z
      .string()
      .describe('The slug of your Buildkite organization (found in your Buildkite URL)')
  })
);
