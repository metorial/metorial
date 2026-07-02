import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Zoom
    // Authentication tokens and credentials are handled via auth.ts
  })
);
