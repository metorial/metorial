import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationSlug: {
      schema: z
        .string()
        .describe('The slug of your Buildkite organization (found in your Buildkite URL)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
