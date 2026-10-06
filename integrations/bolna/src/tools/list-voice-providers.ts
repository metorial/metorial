import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVoiceProviders = SlateTool.create(spec, {
  name: 'List Voice Providers',
  key: 'list_voice_providers',
  description:
    'Discover supported TTS providers and models for a language, including the IDs needed by list_voices.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      language: z
        .string()
        .optional()
        .describe('Language code such as en, hi, or ta; defaults to en')
    })
  )
  .output(
    z.object({
      language: z.string(),
      providers: z.array(
        z.object({
          providerId: z.string(),
          name: z.string(),
          slug: z.string(),
          supported: z.boolean().optional(),
          models: z.array(
            z.object({
              modelId: z.string(),
              model: z.string(),
              name: z.string(),
              supported: z.boolean().optional(),
              isDefault: z.boolean().optional()
            })
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let language = ctx.input.language ?? 'en';
    let result = await new Client(ctx.auth.token).listVoiceProviders(language);
    let providers = result.providers.map((p: any) => ({
      providerId: p.id,
      name: p.name,
      slug: p.slug,
      supported: p.is_supported ?? undefined,
      models: p.models.map((m: any) => ({
        modelId: m.id,
        model: m.model_id,
        name: m.display_name,
        supported: m.is_supported ?? undefined,
        isDefault: m.default ?? undefined
      }))
    }));
    return {
      output: { language, providers },
      message: `Found **${providers.length}** voice provider(s) for ${language}.`
    };
  })
  .build();
