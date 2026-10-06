import { SlateConfig } from 'slates';
import { z } from 'zod';
import { host } from './lib/schemas';
export const config = SlateConfig.create(
  z.object({
    publicationHost: host
      .optional()
      .describe(
        'Optional default publication hostname. Individual tools can select an exact publication ID or hostname; omit this to use publication discovery first.'
      )
  })
);
