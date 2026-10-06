import { SlateConfig } from 'slates';
import { z } from 'zod';
import { resourceId } from './lib/schemas';
export let config = SlateConfig.create(
  z
    .object({
      spaceId: resourceId
        .optional()
        .describe(
          'Optional default space ID. Discover spaces with list_spaces, or supply spaceId on each tool.'
        ),
      environmentId: resourceId
        .optional()
        .describe(
          'Optional default environment ID or alias; defaults to master. Discover environments with list_environments.'
        )
    })
    .passthrough()
);
