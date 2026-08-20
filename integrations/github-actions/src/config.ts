import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // GitHub Actions API base URL is always https://api.github.com
    // No global configuration is needed
  }
});
