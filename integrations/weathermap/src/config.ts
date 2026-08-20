import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    units: {
      schema: z
        .enum(['standard', 'metric', 'imperial'])
        .default('metric')
        .describe(
          'Unit system for temperature and measurements. standard=Kelvin, metric=Celsius, imperial=Fahrenheit'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    language: {
      schema: z
        .string()
        .default('en')
        .describe('Language code for weather descriptions (e.g. en, fr, de, es, zh_cn)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
