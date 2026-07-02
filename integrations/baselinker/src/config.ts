import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // BaseLinker uses a single POST endpoint with no configurable base URL or environment
    // All configuration is handled via the API token in auth
  })
);
