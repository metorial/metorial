import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    language: z
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
      .describe(
        'Translation language for single-IP geolocation details; requires a Plus or Security plan'
      )
  })
);
