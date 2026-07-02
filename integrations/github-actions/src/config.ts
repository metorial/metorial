import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // GitHub Actions API base URL is always https://api.github.com
    // No global configuration is needed
  })
);
