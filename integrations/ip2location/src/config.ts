import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    language: {
      schema: z
        .enum([
          'ar',
          'cs',
          'da',
          'de',
          'en',
          'es',
          'et',
          'fi',
          'fr',
          'ga',
          'it',
          'ja',
          'ko',
          'ms',
          'nl',
          'pt',
          'ru',
          'sv',
          'tr',
          'vi',
          'zh-cn',
          'zh-tw'
        ])
        .default('en')
        .describe('Language code for translated geolocation results (ISO 639-1)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
