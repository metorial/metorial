import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed - Leiga uses a single base URL
    // and all project-specific context is passed per-tool/trigger
  }
});
