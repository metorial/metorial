import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    deploymentUrl: z
      .string()
      .describe('The Convex deployment URL (e.g. https://happy-animal-123.convex.cloud)')
  })
);
