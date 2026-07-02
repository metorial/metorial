import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let llmConfigSchema = z
  .object({
    provider: z
      .string()
      .optional()
      .describe('LLM provider (e.g. "openai", "anthropic", "deepgram")'),
    model: z
      .string()
      .optional()
      .describe('Model name (e.g. "gpt-4o-mini", "claude-3-5-sonnet")'),
    maxTokens: z.number().optional().describe('Maximum tokens for response'),
    temperature: z.number().optional().describe('Temperature for response generation'),
    topP: z.number().optional().describe('Top P sampling parameter'),
    frequencyPenalty: z.number().optional().describe('Frequency penalty'),
    presencePenalty: z.number().optional().describe('Presence penalty'),
    baseUrl: z.string().optional().describe('Base URL for custom/self-hosted LLM endpoint')
  })
  .optional()
  .describe('LLM configuration');

let synthesizerSchema = z
  .object({
    provider: z
      .enum(['elevenlabs', 'polly', 'deepgram', 'cartesia', 'sarvam', 'styletts'])
      .optional()
      .describe('TTS provider'),
    providerConfig: z
      .object({
        voice: z.string().optional().describe('Voice name'),
        voiceId: z.string().optional().describe('Voice ID'),
        model: z.string().optional().describe('TTS model'),
        engine: z.string().optional().describe('Engine (for Polly)'),
        language: z.string().optional().describe('Language code')
      })
      .optional()
      .describe('Provider-specific TTS configuration'),
    stream: z.boolean().optional().describe('Enable streaming'),
    bufferSize: z.number().optional().describe('Buffer size'),
    audioFormat: z.string().optional().describe('Audio output format')
  })
  .optional()
  .describe('Text-to-speech synthesizer configuration');

let transcriberSchema = z
  .object({
    provider: z.enum(['deepgram', 'bodhi']).optional().describe('ASR provider'),
    model: z.string().optional().describe('Transcription model (e.g. "nova-3")'),
    language: z.string().optional().describe('Language code (e.g. "en", "hi")')
  })
  .optional()
  .describe('Speech-to-text transcriber configuration');

let taskConfigSchema = z
  .object({
    hangupAfterSilence: z.number().optional().describe('Seconds of silence before hangup'),
    incrementalDelay: z.number().optional().describe('Incremental delay in ms'),
    numberOfWordsForInterruption: z
      .number()
      .optional()
      .describe('Words needed to trigger interruption'),
    backchanneling: z.boolean().optional().describe('Enable backchanneling'),
    ambientNoise: z.boolean().optional().describe('Enable ambient noise'),
    callTerminate: z.number().optional().describe('Max call duration in seconds'),
    voicemail: z.boolean().optional().describe('Enable voicemail detection')
  })
  .optional()
  .describe('Task behavior configuration');

export let createAgent = SlateTool.create(spec, {
  name: 'Create Agent',
  key: 'create_agent',
  description: `Create a new Bolna Voice AI agent with a configured conversation pipeline. The agent can be used for outbound or inbound calls with customizable LLM, TTS, and ASR settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      agentName: z.string().describe('Name of the agent'),
      welcomeMessage: z
        .string()
        .optional()
        .describe(
          'Welcome message spoken when the call connects. Supports {variable} placeholders.'
        ),
      systemPrompt: z
        .string()
        .describe('System prompt defining the agent behavior and instructions'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL for receiving call status updates'),
      agentType: z.string().optional().describe('Agent type classification'),
      llmConfig: llmConfigSchema,
      synthesizer: synthesizerSchema,
      transcriber: transcriberSchema,
      taskConfig: taskConfigSchema,
      knowledgeBaseIds: z
        .array(z.string())
        .optional()
        .describe('Knowledge base IDs to connect to the agent'),
      callingGuardrails: z
        .object({
          callStartHour: z.number().optional().describe('Earliest hour to make calls (0-23)'),
          callEndHour: z.number().optional().describe('Latest hour to make calls (0-23)')
        })
        .optional()
        .describe('Time-based calling restrictions')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the created agent'),
      status: z.string().describe('Creation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let llmAgent: Record<string, any> = {
      agent_type: input.knowledgeBaseIds?.length ? 'knowledgebase_agent' : 'simple_llm_agent',
      agent_flow_type: 'streaming'
    };

    if (input.llmConfig) {
      llmAgent.llm_config = {
        ...(input.llmConfig.provider && { provider: input.llmConfig.provider }),
        ...(input.llmConfig.model && { model: input.llmConfig.model }),
        ...(input.llmConfig.maxTokens && { max_tokens: input.llmConfig.maxTokens }),
        ...(input.llmConfig.temperature !== undefined && {
          temperature: input.llmConfig.temperature
        }),
        ...(input.llmConfig.topP !== undefined && { top_p: input.llmConfig.topP }),
        ...(input.llmConfig.frequencyPenalty !== undefined && {
          frequency_penalty: input.llmConfig.frequencyPenalty
        }),
        ...(input.llmConfig.presencePenalty !== undefined && {
          presence_penalty: input.llmConfig.presencePenalty
        }),
        ...(input.llmConfig.baseUrl && { base_url: input.llmConfig.baseUrl })
      };
    }

    if (input.knowledgeBaseIds?.length) {
      llmAgent.knowledgebase_id = input.knowledgeBaseIds;
    }

    let toolsConfig: Record<string, any> = {
      llm_agent: llmAgent
    };

    if (input.synthesizer) {
      toolsConfig.synthesizer = {
        ...(input.synthesizer.provider && { provider: input.synthesizer.provider }),
        ...(input.synthesizer.providerConfig && {
          provider_config: {
            ...(input.synthesizer.providerConfig.voice && {
              voice: input.synthesizer.providerConfig.voice
            }),
            ...(input.synthesizer.providerConfig.voiceId && {
              voice_id: input.synthesizer.providerConfig.voiceId
            }),
            ...(input.synthesizer.providerConfig.model && {
              model: input.synthesizer.providerConfig.model
            }),
            ...(input.synthesizer.providerConfig.engine && {
              engine: input.synthesizer.providerConfig.engine
            }),
            ...(input.synthesizer.providerConfig.language && {
              language: input.synthesizer.providerConfig.language
            })
          }
        }),
        ...(input.synthesizer.stream !== undefined && { stream: input.synthesizer.stream }),
        ...(input.synthesizer.bufferSize && { buffer_size: input.synthesizer.bufferSize }),
        ...(input.synthesizer.audioFormat && { audio_format: input.synthesizer.audioFormat })
      };
    }

    if (input.transcriber) {
      toolsConfig.transcriber = {
        ...(input.transcriber.provider && { provider: input.transcriber.provider }),
        ...(input.transcriber.model && { model: input.transcriber.model }),
        ...(input.transcriber.language && { language: input.transcriber.language })
      };
    }

    let taskConfig: Record<string, any> = {};
    if (input.taskConfig) {
      if (input.taskConfig.hangupAfterSilence !== undefined)
        taskConfig.hangup_after_silence = input.taskConfig.hangupAfterSilence;
      if (input.taskConfig.incrementalDelay !== undefined)
        taskConfig.incremental_delay = input.taskConfig.incrementalDelay;
      if (input.taskConfig.numberOfWordsForInterruption !== undefined)
        taskConfig.number_of_words_for_interruption =
          input.taskConfig.numberOfWordsForInterruption;
      if (input.taskConfig.backchanneling !== undefined)
        taskConfig.backchanneling = input.taskConfig.backchanneling;
      if (input.taskConfig.ambientNoise !== undefined)
        taskConfig.ambient_noise = input.taskConfig.ambientNoise;
      if (input.taskConfig.callTerminate !== undefined)
        taskConfig.call_terminate = input.taskConfig.callTerminate;
      if (input.taskConfig.voicemail !== undefined)
        taskConfig.voicemail = input.taskConfig.voicemail;
    }

    let agentConfig: Record<string, any> = {
      agent_name: input.agentName,
      tasks: [
        {
          task_type: 'conversation',
          tools_config: toolsConfig,
          task_config: taskConfig
        }
      ]
    };

    if (input.welcomeMessage) agentConfig.agent_welcome_message = input.welcomeMessage;
    if (input.webhookUrl) agentConfig.webhook_url = input.webhookUrl;
    if (input.agentType) agentConfig.agent_type = input.agentType;
    if (input.callingGuardrails) {
      agentConfig.calling_guardrails = {
        ...(input.callingGuardrails.callStartHour !== undefined && {
          call_start_hour: input.callingGuardrails.callStartHour
        }),
        ...(input.callingGuardrails.callEndHour !== undefined && {
          call_end_hour: input.callingGuardrails.callEndHour
        })
      };
    }

    let agentPrompts: Record<string, any> = {
      task_1: { system_prompt: input.systemPrompt }
    };

    let result = await client.createAgent(agentConfig, agentPrompts);

    return {
      output: {
        agentId: result.agent_id,
        status: result.status || 'created'
      },
      message: `Created agent **${input.agentName}** with ID \`${result.agent_id}\`.`
    };
  })
  .build();
