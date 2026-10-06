import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transcriptionProviderSchema = z
  .enum([
    '11labs',
    'vapi',
    'xai',
    'assembly-ai',
    'azure',
    'custom-transcriber',
    'deepgram',
    'gladia',
    'google',
    'openai',
    'speechmatics',
    'talkscriber',
    'cartesia',
    'soniox'
  ])
  .optional()
  .describe('Transcription provider');

let modelProviderSchema = z
  .enum([
    'anthropic-bedrock',
    'cerebras',
    'deep-seek',
    'minimax',
    'anthropic',
    'anyscale',
    'custom-llm-model',
    'custom-llm',
    'deepinfra',
    'google',
    'groq',
    'inflection-ai',
    'openai',
    'openrouter',
    'perplexity-ai',
    'together-ai',
    'vapi',
    'xai'
  ])
  .optional()
  .describe('LLM provider');

let voiceProviderSchema = z
  .enum([
    '11labs',
    'azure',
    'cartesia',
    'custom-voice',
    'deepgram',
    'lmnt',
    'hume',
    'inworld',
    'minimax',
    'microsoft',
    'neuphonic',
    'smallest-ai',
    'sesame',
    'wellsaid',
    'xai',
    'neets',
    'openai',
    'playht',
    'rime-ai',
    'tavus',
    'vapi'
  ])
  .optional()
  .describe('Voice/TTS provider');

export let manageAssistant = SlateTool.create(spec, {
  name: 'Manage Assistant',
  key: 'manage_assistant',
  description: `Create, update, retrieve, or delete a Vapi voice AI assistant. Assistants combine a transcriber, LLM, and voice to handle voice conversations. Use this to configure assistant behavior including first message, system prompt, voice settings, model, and turn-taking behavior.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Action to perform'),
      assistantId: z
        .string()
        .optional()
        .describe('Assistant ID (required for get, update, delete)'),
      name: z.string().max(40).optional().describe('Name of the assistant'),
      firstMessage: z
        .string()
        .optional()
        .describe('First message the assistant says when a call begins'),
      systemPrompt: z
        .string()
        .optional()
        .describe('System prompt / instructions for the assistant LLM'),
      model: z
        .object({
          provider: modelProviderSchema,
          model: z
            .string()
            .optional()
            .describe('Model identifier (e.g. gpt-4o, claude-3-5-sonnet)'),
          temperature: z.number().optional().describe('Temperature for the model (0-2)'),
          maxTokens: z.number().optional().describe('Max tokens for the model response'),
          systemMessage: z.string().optional().describe('System message for the model'),
          url: z.string().optional().describe('Endpoint URL for a custom-llm model'),
          headers: z
            .record(z.string(), z.string())
            .optional()
            .describe('Request headers for a custom-llm model'),
          toolIds: z
            .array(z.string())
            .optional()
            .describe('Reusable tool IDs from list_tools'),
          messages: z
            .array(z.object({ role: z.string(), content: z.string() }))
            .optional()
            .describe('Model conversation messages')
        })
        .optional()
        .describe('LLM model configuration'),
      voice: z
        .object({
          provider: voiceProviderSchema,
          voiceId: z.string().optional().describe('Voice ID from the provider'),
          model: z.string().optional().describe('Voice model identifier; required for sesame'),
          language: z
            .string()
            .optional()
            .describe('Voice language code; required for neuphonic, such as en or de'),
          server: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Server configuration for a custom voice'),
          speed: z.number().optional().describe('Speech speed multiplier'),
          stability: z.number().optional().describe('Voice stability (ElevenLabs)'),
          similarityBoost: z
            .number()
            .optional()
            .describe('Voice similarity boost (ElevenLabs)')
        })
        .optional()
        .describe('Voice/TTS configuration'),
      transcriber: z
        .object({
          provider: transcriptionProviderSchema,
          model: z.string().optional().describe('Transcriber model identifier'),
          language: z.string().optional().describe('Language code for transcription'),
          server: z
            .record(z.string(), z.unknown())
            .optional()
            .describe('Server configuration for a custom transcriber'),
          customVocabulary: z
            .array(z.record(z.string(), z.unknown()))
            .optional()
            .describe('Custom vocabulary for speechmatics')
        })
        .optional()
        .describe('Transcriber/STT configuration'),
      endCallAfterSilenceSeconds: z
        .number()
        .optional()
        .describe('Legacy alias for silenceTimeoutSeconds'),
      maxDurationSeconds: z
        .number()
        .min(10)
        .max(43200)
        .optional()
        .describe('Maximum call duration in seconds'),
      backgroundDenoisingEnabled: z
        .boolean()
        .optional()
        .describe('Enable background noise reduction'),
      serverUrl: z.string().optional().describe('Server URL for receiving webhook events'),
      silenceTimeoutSeconds: z
        .number()
        .optional()
        .describe('Timeout in seconds for silence detection'),
      responseDelaySeconds: z
        .number()
        .min(0)
        .max(5)
        .optional()
        .describe('Delay before assistant responds'),
      stopSpeakingPlan: z
        .object({
          numWords: z.number().min(0).max(10).optional(),
          voiceSeconds: z.number().min(0).max(0.5).optional(),
          backoffSeconds: z.number().min(0).max(10).optional(),
          acknowledgementPhrases: z.array(z.string()).optional(),
          interruptionPhrases: z.array(z.string()).optional()
        })
        .optional()
        .describe('Current interruption settings'),
      interruptionsEnabled: z
        .boolean()
        .optional()
        .describe('Legacy unsupported setting; use stopSpeakingPlan instead')
    })
  )
  .output(
    z.object({
      assistantId: z.string().optional().describe('ID of the assistant'),
      name: z.string().max(40).optional().describe('Name of the assistant'),
      firstMessage: z.string().optional().describe('First message the assistant says'),
      model: z.any().optional().describe('Model configuration'),
      voice: z.any().optional().describe('Voice configuration'),
      transcriber: z.any().optional().describe('Transcriber configuration'),
      silenceTimeoutSeconds: z.number().optional().describe('Inactivity timeout in seconds'),
      maxDurationSeconds: z.number().optional().describe('Maximum call duration in seconds'),
      startSpeakingPlan: z.any().optional().describe('Response timing configuration'),
      stopSpeakingPlan: z.any().optional().describe('Interruption configuration'),
      backgroundSpeechDenoisingPlan: z
        .any()
        .optional()
        .describe('Background noise reduction configuration'),
      server: z.any().optional().describe('Event receiver configuration'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the assistant was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, ctx.auth.region);
    let { action, assistantId, ...config } = ctx.input;

    if (action === 'get') {
      if (!assistantId) throw createApiServiceError('assistantId is required for get action');
      let assistant = await client.getAssistant(assistantId);
      return {
        output: {
          assistantId: assistant.id,
          name: assistant.name,
          firstMessage: assistant.firstMessage,
          model: assistant.model,
          voice: assistant.voice,
          transcriber: assistant.transcriber,
          silenceTimeoutSeconds: assistant.silenceTimeoutSeconds,
          maxDurationSeconds: assistant.maxDurationSeconds,
          startSpeakingPlan: assistant.startSpeakingPlan,
          stopSpeakingPlan: assistant.stopSpeakingPlan,
          backgroundSpeechDenoisingPlan: assistant.backgroundSpeechDenoisingPlan,
          server: assistant.server,
          createdAt: assistant.createdAt,
          updatedAt: assistant.updatedAt
        },
        message: `Retrieved assistant **${assistant.name || assistant.id}**.`
      };
    }

    if (action === 'delete') {
      if (!assistantId)
        throw createApiServiceError('assistantId is required for delete action');
      await client.deleteAssistant(assistantId);
      return {
        output: { assistantId, deleted: true },
        message: `Deleted assistant **${assistantId}**.`
      };
    }

    if (config.interruptionsEnabled !== undefined) {
      throw createApiServiceError(
        'Vapi does not support interruptionsEnabled. Use stopSpeakingPlan to configure interruption behavior.'
      );
    }
    if (
      config.endCallAfterSilenceSeconds !== undefined &&
      config.silenceTimeoutSeconds !== undefined &&
      config.endCallAfterSilenceSeconds !== config.silenceTimeoutSeconds
    ) {
      throw createApiServiceError(
        'endCallAfterSilenceSeconds and silenceTimeoutSeconds must agree when both are provided.'
      );
    }
    let current =
      action === 'update' && assistantId ? await client.getAssistant(assistantId) : undefined;
    let body: Record<string, any> = {};
    if (config.name !== undefined) body.name = config.name;
    if (config.firstMessage !== undefined) body.firstMessage = config.firstMessage;
    if (config.serverUrl !== undefined)
      body.server = { ...current?.server, url: config.serverUrl };
    if (config.maxDurationSeconds !== undefined)
      body.maxDurationSeconds = config.maxDurationSeconds;
    // The generated OpenAPI omits silenceTimeoutSeconds; Vapi's timeout guide documents it.
    if (
      config.silenceTimeoutSeconds !== undefined ||
      config.endCallAfterSilenceSeconds !== undefined
    ) {
      body.silenceTimeoutSeconds =
        config.silenceTimeoutSeconds ?? config.endCallAfterSilenceSeconds;
    }
    if (config.backgroundDenoisingEnabled !== undefined) {
      body.backgroundSpeechDenoisingPlan = {
        ...current?.backgroundSpeechDenoisingPlan,
        smartDenoisingPlan: { enabled: config.backgroundDenoisingEnabled }
      };
    }
    if (config.responseDelaySeconds !== undefined) {
      body.startSpeakingPlan = {
        ...current?.startSpeakingPlan,
        waitSeconds: config.responseDelaySeconds
      };
    }
    if (config.stopSpeakingPlan)
      body.stopSpeakingPlan = { ...current?.stopSpeakingPlan, ...config.stopSpeakingPlan };
    if (config.model || config.systemPrompt !== undefined) {
      let { systemMessage, ...model } = config.model ?? {};
      if (model.provider === 'custom-llm-model') model.provider = 'custom-llm';
      body.model = {
        ...(current?.model && (!model.provider || current.model.provider === model.provider)
          ? current.model
          : {}),
        ...model
      };
      if (!body.model.provider) {
        if (action === 'create')
          body.model = { provider: 'openai', model: 'gpt-4o-mini', ...body.model };
        else
          throw createApiServiceError(
            'Choose a model provider when updating an assistant without a saved model.'
          );
      }
      if (body.model.provider !== 'vapi' && !body.model.model) {
        throw createApiServiceError(
          'A model identifier is required for the selected model provider.'
        );
      }
      if (body.model.provider === 'custom-llm' && !body.model.url) {
        throw createApiServiceError('Custom LLM models require model.url.');
      }
      let prompt = systemMessage ?? config.systemPrompt;
      if (prompt !== undefined) {
        body.model.messages = [
          { role: 'system', content: prompt },
          ...(body.model.messages ?? []).filter(
            (message: { role?: string }) => message.role !== 'system'
          )
        ];
      }
    }
    if (config.voice) {
      body.voice = {
        ...(current?.voice &&
        (!config.voice.provider || current.voice.provider === config.voice.provider)
          ? current.voice
          : {}),
        ...config.voice
      };
      if (body.voice.provider === 'neets')
        throw createApiServiceError(
          'Vapi no longer supports the neets voice provider. Select a current voice provider.'
        );
      if (!body.voice.provider)
        throw createApiServiceError(
          'voice.provider is required when no saved voice configuration exists.'
        );
      if (body.voice.provider === 'custom-voice') {
        if (!body.voice.server)
          throw createApiServiceError('Custom voices require voice.server.');
      } else if (!body.voice.voiceId)
        throw createApiServiceError(
          'voice.voiceId is required for the selected voice provider.'
        );
      if (body.voice.provider === 'sesame' && !body.voice.model)
        throw createApiServiceError('The sesame voice provider requires voice.model.');
      if (body.voice.provider === 'neuphonic' && !body.voice.language)
        throw createApiServiceError('The neuphonic voice provider requires voice.language.');
    }
    if (config.transcriber) {
      body.transcriber = {
        ...(current?.transcriber &&
        (!config.transcriber.provider ||
          current.transcriber.provider === config.transcriber.provider)
          ? current.transcriber
          : {}),
        ...config.transcriber
      };
      if (!body.transcriber.provider)
        throw createApiServiceError(
          'transcriber.provider is required when no saved transcriber configuration exists.'
        );
      if (body.transcriber.provider === 'custom-transcriber' && !body.transcriber.server)
        throw createApiServiceError('Custom transcribers require transcriber.server.');
      if (body.transcriber.provider === 'openai' && !body.transcriber.model)
        throw createApiServiceError('The openai transcriber requires transcriber.model.');
      if (body.transcriber.provider === 'speechmatics' && !body.transcriber.customVocabulary)
        throw createApiServiceError(
          'The speechmatics transcriber requires transcriber.customVocabulary, which may be an empty array.'
        );
    }

    if (action === 'create') {
      let assistant = await client.createAssistant(body);
      return {
        output: {
          assistantId: assistant.id,
          name: assistant.name,
          firstMessage: assistant.firstMessage,
          model: assistant.model,
          voice: assistant.voice,
          transcriber: assistant.transcriber,
          silenceTimeoutSeconds: assistant.silenceTimeoutSeconds,
          maxDurationSeconds: assistant.maxDurationSeconds,
          startSpeakingPlan: assistant.startSpeakingPlan,
          stopSpeakingPlan: assistant.stopSpeakingPlan,
          backgroundSpeechDenoisingPlan: assistant.backgroundSpeechDenoisingPlan,
          server: assistant.server,
          createdAt: assistant.createdAt,
          updatedAt: assistant.updatedAt
        },
        message: `Created assistant **${assistant.name || assistant.id}**.`
      };
    }

    if (action === 'update') {
      if (!assistantId)
        throw createApiServiceError('assistantId is required for update action');
      let assistant = await client.updateAssistant(assistantId, body);
      return {
        output: {
          assistantId: assistant.id,
          name: assistant.name,
          firstMessage: assistant.firstMessage,
          model: assistant.model,
          voice: assistant.voice,
          transcriber: assistant.transcriber,
          silenceTimeoutSeconds: assistant.silenceTimeoutSeconds,
          maxDurationSeconds: assistant.maxDurationSeconds,
          startSpeakingPlan: assistant.startSpeakingPlan,
          stopSpeakingPlan: assistant.stopSpeakingPlan,
          backgroundSpeechDenoisingPlan: assistant.backgroundSpeechDenoisingPlan,
          server: assistant.server,
          createdAt: assistant.createdAt,
          updatedAt: assistant.updatedAt
        },
        message: `Updated assistant **${assistant.name || assistant.id}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
