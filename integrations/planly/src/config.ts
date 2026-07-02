import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Planly
    // All operations are scoped by teamId which is passed per-tool
  })
);
