import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Fivetran API uses a fixed base URL; no global configuration needed.
  })
);
