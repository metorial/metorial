import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transcriptionProviderSchema = z
  .enum([
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
    'anthropic',
    'anyscale',
    'custom-llm-model',
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
      name: z.string().optional().describe('Name of the assistant'),
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
          systemMessage: z.string().optional().describe('System message for the model')
        })
        .optional()
        .describe('LLM model configuration'),
      voice: z
        .object({
          provider: voiceProviderSchema,
          voiceId: z.string().optional().describe('Voice ID from the provider'),
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
          language: z.string().optional().describe('Language code for transcription')
        })
        .optional()
        .describe('Transcriber/STT configuration'),
      endCallAfterSilenceSeconds: z
        .number()
        .optional()
        .describe('End call after this many seconds of silence'),
      maxDurationSeconds: z.number().optional().describe('Maximum call duration in seconds'),
      backgroundDenoisingEnabled: z
        .boolean()
        .optional()
        .describe('Enable background noise reduction'),
      serverUrl: z.string().optional().describe('Server URL for receiving webhook events'),
      silenceTimeoutSeconds: z
        .number()
        .optional()
        .describe('Timeout in seconds for silence detection'),
      responseDelaySeconds: z.number().optional().describe('Delay before assistant responds'),
      interruptionsEnabled: z
        .boolean()
        .optional()
        .describe('Whether the user can interrupt the assistant')
    })
  )
  .output(
    z.object({
      assistantId: z.string().optional().describe('ID of the assistant'),
      name: z.string().optional().describe('Name of the assistant'),
      firstMessage: z.string().optional().describe('First message the assistant says'),
      model: z.any().optional().describe('Model configuration'),
      voice: z.any().optional().describe('Voice configuration'),
      transcriber: z.any().optional().describe('Transcriber configuration'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the assistant was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, assistantId, ...config } = ctx.input;

    if (action === 'get') {
      if (!assistantId) throw new Error('assistantId is required for get action');
      let assistant = await client.getAssistant(assistantId);
      return {
        output: {
          assistantId: assistant.id,
          name: assistant.name,
          firstMessage: assistant.firstMessage,
          model: assistant.model,
          voice: assistant.voice,
          transcriber: assistant.transcriber,
          createdAt: assistant.createdAt,
          updatedAt: assistant.updatedAt
        },
        message: `Retrieved assistant **${assistant.name || assistant.id}**.`
      };
    }

    if (action === 'delete') {
      if (!assistantId) throw new Error('assistantId is required for delete action');
      await client.deleteAssistant(assistantId);
      return {
        output: { assistantId, deleted: true },
        message: `Deleted assistant **${assistantId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (config.name) body.name = config.name;
    if (config.firstMessage) body.firstMessage = config.firstMessage;
    if (config.serverUrl) body.serverUrl = config.serverUrl;
    if (config.endCallAfterSilenceSeconds !== undefined)
      body.endCallAfterSilenceSeconds = config.endCallAfterSilenceSeconds;
    if (config.maxDurationSeconds !== undefined)
      body.maxDurationSeconds = config.maxDurationSeconds;
    if (config.backgroundDenoisingEnabled !== undefined)
      body.backgroundDenoisingEnabled = config.backgroundDenoisingEnabled;
    if (config.silenceTimeoutSeconds !== undefined)
      body.silenceTimeoutSeconds = config.silenceTimeoutSeconds;
    if (config.responseDelaySeconds !== undefined)
      body.responseDelaySeconds = config.responseDelaySeconds;
    if (config.interruptionsEnabled !== undefined)
      body.interruptionsEnabled = config.interruptionsEnabled;

    if (config.model) {
      body.model = {} as Record<string, any>;
      if (config.model.provider) body.model.provider = config.model.provider;
      if (config.model.model) body.model.model = config.model.model;
      if (config.model.temperature !== undefined)
        body.model.temperature = config.model.temperature;
      if (config.model.maxTokens !== undefined) body.model.maxTokens = config.model.maxTokens;
      if (config.model.systemMessage || config.systemPrompt) {
        body.model.messages = [
          { role: 'system', content: config.model.systemMessage || config.systemPrompt }
        ];
      }
    } else if (config.systemPrompt) {
      body.model = { messages: [{ role: 'system', content: config.systemPrompt }] };
    }

    if (config.voice) {
      body.voice = {} as Record<string, any>;
      if (config.voice.provider) body.voice.provider = config.voice.provider;
      if (config.voice.voiceId) body.voice.voiceId = config.voice.voiceId;
      if (config.voice.speed !== undefined) body.voice.speed = config.voice.speed;
      if (config.voice.stability !== undefined) body.voice.stability = config.voice.stability;
      if (config.voice.similarityBoost !== undefined)
        body.voice.similarityBoost = config.voice.similarityBoost;
    }

    if (config.transcriber) {
      body.transcriber = {} as Record<string, any>;
      if (config.transcriber.provider) body.transcriber.provider = config.transcriber.provider;
      if (config.transcriber.model) body.transcriber.model = config.transcriber.model;
      if (config.transcriber.language) body.transcriber.language = config.transcriber.language;
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
          createdAt: assistant.createdAt,
          updatedAt: assistant.updatedAt
        },
        message: `Created assistant **${assistant.name || assistant.id}**.`
      };
    }

    if (action === 'update') {
      if (!assistantId) throw new Error('assistantId is required for update action');
      let assistant = await client.updateAssistant(assistantId, body);
      return {
        output: {
          assistantId: assistant.id,
          name: assistant.name,
          firstMessage: assistant.firstMessage,
          model: assistant.model,
          voice: assistant.voice,
          transcriber: assistant.transcriber,
          createdAt: assistant.createdAt,
          updatedAt: assistant.updatedAt
        },
        message: `Updated assistant **${assistant.name || assistant.id}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
