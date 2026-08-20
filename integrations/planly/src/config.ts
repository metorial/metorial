import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Planly
    // All operations are scoped by teamId which is passed per-tool
  }
});
