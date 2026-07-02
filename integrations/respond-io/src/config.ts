import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global config needed - Respond.io uses a single workspace-level API
    // The base URL is fixed at https://api.respond.io/v2
  })
);
