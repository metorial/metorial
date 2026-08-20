import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // BaseLinker uses a single POST endpoint with no configurable base URL or environment
    // All configuration is handled via the API token in auth
  }
});
