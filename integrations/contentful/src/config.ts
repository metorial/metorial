import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    spaceId: {
      schema: z
        .string()
        .describe(
          'The Contentful Space ID. Found in Settings > General in the Contentful web app.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    environmentId: {
      schema: z
        .string()
        .default('master')
        .describe('The environment ID to use within the space. Defaults to "master".'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    region: {
      schema: z
        .enum(['us', 'eu'])
        .default('us')
        .describe('Data residency region. Use "eu" for European data residency.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
