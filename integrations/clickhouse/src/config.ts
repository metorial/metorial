import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .describe(
        'The ClickHouse Cloud organization ID. All API operations are scoped to this organization.'
      )
  })
);
