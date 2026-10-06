import { SlateConfig } from 'slates';
import { z } from 'zod';
import { apiVersion } from './lib/schemas';

export const config = SlateConfig.create(
  z
    .object({
      apiVersion: apiVersion
        .default('2024-01-01')
        .describe(
          'Pinned API version date. The existing 2024-01-01 behavior remains the default.'
        )
    })
    .passthrough()
);
