import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    language: z.enum(['ru', 'en']).default('ru').describe('Default language for API responses')
  })
);
