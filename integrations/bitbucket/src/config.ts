import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspace: {
      schema: z
        .string()
        .describe(
          'Bitbucket workspace slug. All API operations will be scoped to this workspace.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
