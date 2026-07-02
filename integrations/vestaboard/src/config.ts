import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Vestaboard.
    // API type and credentials are handled through authentication.
  })
);
