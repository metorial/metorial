import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    units: z
      .enum(['standard', 'metric', 'imperial'])
      .default('metric')
      .describe(
        'Unit system for temperature and measurements. standard=Kelvin, metric=Celsius, imperial=Fahrenheit'
      ),
    language: z
      .string()
      .default('en')
      .describe('Language code for weather descriptions (e.g. en, fr, de, es, zh_cn)')
  })
);
