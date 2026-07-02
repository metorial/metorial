import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeepgramClient } from '../lib/client';
import { spec } from '../spec';

let modelSchema = z.object({
  modelId: z.string().describe('Unique model identifier.'),
  name: z.string().optional().describe('Model name.'),
  canonicalName: z.string().optional().describe('Canonical model name.'),
  architecture: z.string().optional().describe('Model architecture.'),
  version: z.string().optional().describe('Model version.'),
  languages: z.array(z.string()).optional().describe('Supported languages.'),
  batch: z
    .boolean()
    .optional()
    .describe('Whether the model supports batch/pre-recorded audio.'),
  streaming: z.boolean().optional().describe('Whether the model supports streaming audio.'),
  formattedOutput: z
    .boolean()
    .optional()
    .describe('Whether the model supports formatted output.'),
  metadata: z.any().optional().describe('Additional model metadata.')
});

let mapModel = (m: any): z.infer<typeof modelSchema> => ({
  modelId: m.uuid || m.model_id || m.canonical_name || '',
  name: m.name,
  canonicalName: m.canonical_name,
  architecture: m.architecture,
  version: m.version,
  languages: m.languages,
  batch: m.batch,
  streaming: m.streaming,
  formattedOutput: m.formatted_output,
  metadata: m.metadata
});

let mapModels = (models: any[]): z.infer<typeof modelSchema>[] => (models || []).map(mapModel);

let modelsOutputSchema = z.object({
  sttModels: z.array(modelSchema).optional().describe('Available speech-to-text models.'),
  ttsModels: z.array(modelSchema).optional().describe('Available text-to-speech models.')
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
  .output(modelsOutputSchema)
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.listModels({
      includeOutdated: ctx.input.includeOutdated
    });

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
    let model = mapModel(result.model ?? result);

    return {
      output: {
        ...model,
        modelId: model.modelId || ctx.input.modelId
      },
      message: `Retrieved model **${model.name || ctx.input.modelId}**.`
    };
  })
  .build();

export let listProjectModelsTool = SlateTool.create(spec, {
  name: 'List Project Models',
  key: 'list_project_models',
  description: `List models available to a specific Deepgram project, including custom or non-public models that do not appear in the global model list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      includeOutdated: z
        .boolean()
        .optional()
        .describe('Include outdated/deprecated models in the results.')
    })
  )
  .output(modelsOutputSchema)
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.listProjectModels(ctx.input.projectId, {
      includeOutdated: ctx.input.includeOutdated
    });

    let sttModels = mapModels(result.stt || []);
    let ttsModels = mapModels(result.tts || []);

    return {
      output: {
        sttModels,
        ttsModels
      },
      message: `Found **${sttModels.length}** STT model(s) and **${ttsModels.length}** TTS model(s) for project **${ctx.input.projectId}**.`
    };
  })
  .build();

export let getProjectModelTool = SlateTool.create(spec, {
  name: 'Get Project Model',
  key: 'get_project_model',
  description: `Get detailed metadata for a Deepgram model available to a specific project. Use this for custom or non-public project models.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project.'),
      modelId: z.string().describe('ID/UUID of the project model to retrieve.')
    })
  )
  .output(modelSchema)
  .handleInvocation(async ctx => {
    let client = new DeepgramClient(ctx.auth.token);
    let result = await client.getProjectModel(ctx.input.projectId, ctx.input.modelId);
    let model = mapModel(result.model ?? result);

    return {
      output: {
        ...model,
        modelId: model.modelId || ctx.input.modelId
      },
      message: `Retrieved project model **${model.name || ctx.input.modelId}**.`
    };
  })
  .build();
