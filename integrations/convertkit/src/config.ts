import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for ConvertKit
    // Authentication is handled via auth.ts
  }
});
