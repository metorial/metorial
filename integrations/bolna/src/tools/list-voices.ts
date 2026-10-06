import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description:
    'List a page of TTS voices for a language. Call list_voice_providers to select a provider and model; omitting both IDs lists the requested page from each supported model.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      language: z.string().optional().describe('Language code; defaults to en'),
      providerId: z
        .string()
        .optional()
        .describe('Provider ID from list_voice_providers. Provide together with modelId.'),
      modelId: z
        .string()
        .optional()
        .describe('Model ID from list_voice_providers. Provide together with providerId.'),
      page: z.number().int().min(1).optional().describe('Page number, starting at 1'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Voices per model per page; defaults to 100')
    })
  )
  .output(
    z.object({
      voices: z.array(
        z.object({
          voiceId: z.string().describe('Provider-specific voice ID'),
          name: z.string().describe('Voice name'),
          provider: z.string().optional(),
          model: z.string().optional(),
          accent: z.string().optional(),
          providerId: z.string().optional(),
          modelId: z.string().optional()
        })
      ),
      totalCount: z.number().describe('Number of voices returned on this page'),
      page: z.number().optional(),
      hasMore: z
        .boolean()
        .optional()
        .describe(
          'A full page was returned for at least one model; fetch the next page to continue'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { providerId, modelId, page = 1, pageSize = 100, language = 'en' } = ctx.input;
    if (Boolean(providerId) !== Boolean(modelId))
      throw createApiServiceError(
        'Provide providerId and modelId together, using list_voice_providers.'
      );
    let targets: { providerId: string; modelId: string; provider?: string; model?: string }[];
    if (providerId && modelId) {
      targets = [{ providerId, modelId }];
    } else {
      let catalog = await client.listVoiceProviders(language);
      targets = catalog.providers
        .filter((p: any) => p.is_supported !== false)
        .flatMap((p: any) =>
          p.models
            .filter((m: any) => m.is_supported !== false)
            .map((m: any) => ({
              providerId: p.id,
              modelId: m.id,
              provider: p.slug,
              model: m.model_id
            }))
        );
    }
    let voices: {
      voiceId: string;
      name: string;
      provider?: string;
      model?: string;
      accent?: string;
      providerId: string;
      modelId: string;
    }[] = [];
    let hasMore = false;
    for (let target of targets) {
      let result = await client.listVoices({ ...target, language, page, pageSize });
      hasMore ||= result.items.length === pageSize;
      voices.push(
        ...result.items.map((v: any) => ({
          voiceId: v.voice_id,
          name: v.name,
          provider: target.provider,
          model: target.model,
          accent: v.accent ?? undefined,
          providerId: target.providerId,
          modelId: target.modelId
        }))
      );
    }
    return {
      output: { voices, totalCount: voices.length, page, hasMore },
      message: `Found **${voices.length}** voice(s) on page ${page}.`
    };
  })
  .build();
