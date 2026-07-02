import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed - Leiga uses a single base URL
    // and all project-specific context is passed per-tool/trigger
  })
);
