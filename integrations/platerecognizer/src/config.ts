import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Plate Recognizer
    // All configuration is done per-request via tool inputs
  })
);
