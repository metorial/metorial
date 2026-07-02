import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

let modelSchema = z.object({
  modelId: z.string().describe('Unique model identifier.'),
  name: z.string().optional().describe('Model name.'),
  version: z.string().optional().describe('Model version.'),
  languages: z.array(z.string()).optional().describe('Supported languages.'),
  metadata: z.any().optional().describe('Additional model metadata.')
});

export let listModelsTool = SlateTool.create(spec, {
  name: 'List Models',
  key: 'list_models',
  description: `Query available Deepgram models and their metadata. Useful for discovering which models are available for transcription or text-to-speech and what languages they support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeOutdated: z
        .boolean()
        .optional()
        .describe('Include outdated/deprecated models in the results.')
    })
  )
  .output(
    z.object({
      sttModels: z.array(modelSchema).optional().describe('Available speech-to-text models.'),
      ttsModels: z.array(modelSchema).optional().describe('Available text-to-speech models.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.listModels({
      includeOutdated: ctx.input.includeOutdated
    });

    let mapModels = (models: any[]): z.infer<typeof modelSchema>[] =>
      (models || []).map((m: any) => ({
        modelId: m.uuid || m.model_id || m.canonical_name || '',
        name: m.name,
        version: m.version,
        languages: m.languages,
        metadata: m.metadata
      }));

    let sttModels = mapModels(result.stt || []);
    let ttsModels = mapModels(result.tts || []);

    return {
      output: {
        sttModels,
        ttsModels
      },
      message: `Found **${sttModels.length}** STT model(s) and **${ttsModels.length}** TTS model(s).`
    };
  })
  .build();

export let getModelTool = SlateTool.create(spec, {
  name: 'Get Model',
  key: 'get_model',
  description: `Get detailed metadata for a specific Deepgram model by its ID. Returns model capabilities, supported languages, and version information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID/UUID of the model to retrieve.')
    })
  )
  .output(modelSchema)
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getModel(ctx.input.modelId);

    return {
      output: {
        modelId: result.uuid || result.model_id || result.canonical_name || ctx.input.modelId,
        name: result.name,
        version: result.version,
        languages: result.languages,
        metadata: result.metadata
      },
      message: `Retrieved model **${result.name || ctx.input.modelId}**.`
    };
  })
  .build();
