import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .describe(
          'The ClickHouse Cloud organization ID. All API operations are scoped to this organization.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
