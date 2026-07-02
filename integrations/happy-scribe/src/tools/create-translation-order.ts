import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTranslationOrder = SlateTool.create(spec, {
  name: 'Create Translation Order',
  key: 'create_translation_order',
  description: `Translate an existing transcription into one or more target languages. Supports 70+ target languages with both automatic (AI) and professional (human) translation services. When translating an already-translated transcription, the system automatically uses the original source.`,
  instructions: [
    'You need a completed transcription ID as the source for translation.',
    'Multiple target languages can be specified in a single order.',
    'Set confirm to true to immediately submit, or leave false to create a draft.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceTranscriptionId: z
        .string()
        .describe('ID of the source transcription to translate.'),
      targetLanguages: z
        .array(z.string())
        .describe(
          'Array of BCP-47 language codes to translate into (e.g. ["es", "fr", "de"]).'
        ),
      service: z
        .enum(['auto', 'pro'])
        .optional()
        .describe(
          'Translation service type. "auto" for AI-powered, "pro" for human professional.'
        ),
      confirm: z
        .boolean()
        .optional()
        .describe(
          'Set to true to immediately submit the order. Defaults to false (draft state).'
        ),
      boost: z
        .boolean()
        .optional()
        .describe('Set to true to expedite professional translation for faster turnaround.'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive webhook notifications when the order state changes.'),
      tags: z.array(z.string()).optional().describe('Tags to organize the translation.')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('ID of the created translation order.'),
      state: z.string().describe('Current state of the order.'),
      operations: z
        .any()
        .optional()
        .describe('Operations associated with the translation order.'),
      outputIds: z
        .array(z.string())
        .optional()
        .describe('IDs of the output transcriptions being created.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createTranslationOrder({
      sourceTranscriptionId: ctx.input.sourceTranscriptionId,
      targetLanguages: ctx.input.targetLanguages,
      service: ctx.input.service,
      confirm: ctx.input.confirm,
      boost: ctx.input.boost,
      webhookUrl: ctx.input.webhookUrl,
      tags: ctx.input.tags
    });

    return {
      output: {
        orderId: result.id,
        state: result.state,
        operations: result.operations,
        outputIds: result.outputsIds
      },
      message: `Created translation order **${result.id}** in state **${result.state}** for ${ctx.input.targetLanguages.length} target language(s).`
    };
  })
  .build();
