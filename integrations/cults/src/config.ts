import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Cults3D
    // The API has a single endpoint and no environment-specific settings
  })
);
