import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Pushbullet
    // Authentication is handled via auth.ts
  })
);
