import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global config needed - authentication tokens handle API access
    // Project-specific IDs are passed per-tool as needed
  })
);
