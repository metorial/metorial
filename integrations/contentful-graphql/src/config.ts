import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    spaceId: z
      .string()
      .describe(
        'The Contentful Space ID. Found in Settings > General in the Contentful web app.'
      ),
    environmentId: z
      .string()
      .default('master')
      .describe('The environment ID within the space (e.g. "master"). Defaults to "master".'),
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe(
        'Data residency region. Use "eu" for European data residency (graphql.eu.contentful.com).'
      )
  })
);
