import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
      lpVersion: z
        .string()
        .default('1.49')
        .describe('Learning Platform API version (default: 1.49)'),
      leVersion: z
        .string()
        .default('1.82')
        .describe('Learning Environment API version (default: 1.82)'),
      basVersion: z
        .string()
        .default('1.4')
        .describe('Badge and Award System API version (default: 1.4)')
    })
    // Retain the stored instanceUrl on connections created before the auth migration.
    .passthrough()
);
