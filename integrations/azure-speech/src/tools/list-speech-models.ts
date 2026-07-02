import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpeechToTextClient } from '../lib/client';
import { spec } from '../spec';

export let listSpeechModels = SlateTool.create(spec, {
  name: 'List Speech Models',
  key: 'list_speech_models',
  description: `Lists available base speech-to-text models for all locales, including standard and Whisper models. Use this to discover model IDs for batch transcription.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      top: z.number().optional().describe('Maximum number of records to return (default 100)')
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelUri: z
              .string()
              .describe('Full URI of the model (use as modelUri in batch transcription)'),
            displayName: z.string().describe('Display name of the model'),
            locale: z.string().describe('Locale of the model'),
            status: z.string().describe('Model status (e.g., "Succeeded")'),
            createdAt: z.string().describe('ISO 8601 creation timestamp')
          })
        )
        .describe('List of available base models'),
      totalCount: z.number().describe('Number of models returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpeechToTextClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listBaseModels({
      skip: ctx.input.skip,
      top: ctx.input.top
    });

    let values = result.values || result;
    let models = (values as any[]).map((m: any) => ({
      modelUri: m.self,
      displayName: m.displayName,
      locale: m.locale,
      status: m.status,
      createdAt: m.createdDateTime
    }));

    return {
      output: {
        models,
        totalCount: models.length
      },
      message: `Found **${models.length}** base speech models.`
    };
  })
  .build();
