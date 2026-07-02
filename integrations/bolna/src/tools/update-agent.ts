import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAgent = SlateTool.create(spec, {
  name: 'Update Agent',
  key: 'update_agent',
  description: `Update an existing Bolna Voice AI agent's configuration. Supports partial updates to name, welcome message, system prompt, webhook URL, synthesizer, and telephony provider settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      agentId: z.string().describe('ID of the agent to update'),
      agentName: z.string().optional().describe('New agent name'),
      welcomeMessage: z.string().optional().describe('New welcome message'),
      webhookUrl: z
        .string()
        .nullable()
        .optional()
        .describe('New webhook URL, or null to remove'),
      systemPrompt: z.string().optional().describe('Updated system prompt for the main task'),
      synthesizer: z
        .object({
          provider: z.string().optional().describe('TTS provider'),
          providerConfig: z
            .object({
              voice: z.string().optional().describe('Voice name'),
              voiceId: z.string().optional().describe('Voice ID'),
              model: z.string().optional().describe('TTS model')
            })
            .optional()
            .describe('Provider-specific config'),
          stream: z.boolean().optional(),
          bufferSize: z.number().optional(),
          audioFormat: z.string().optional()
        })
        .optional()
        .describe('Updated synthesizer configuration'),
      telephonyProvider: z
        .enum(['twilio', 'plivo', 'exotel', 'vobiz', 'sip-trunk', 'default'])
        .optional()
        .describe('Telephony provider to use')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the updated agent'),
      status: z.string().describe('Update status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let input = ctx.input;

    let agentConfig: Record<string, any> = {};
    let agentPrompts: Record<string, any> | undefined;

    if (input.agentName) agentConfig.agent_name = input.agentName;
    if (input.welcomeMessage !== undefined)
      agentConfig.agent_welcome_message = input.welcomeMessage;
    if (input.webhookUrl !== undefined) agentConfig.webhook_url = input.webhookUrl;
    if (input.telephonyProvider) agentConfig.telephony_provider = input.telephonyProvider;

    if (input.synthesizer) {
      agentConfig.synthesizer = {
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
            })
          }
        }),
        ...(input.synthesizer.stream !== undefined && { stream: input.synthesizer.stream }),
        ...(input.synthesizer.bufferSize && { buffer_size: input.synthesizer.bufferSize }),
        ...(input.synthesizer.audioFormat && { audio_format: input.synthesizer.audioFormat })
      };
    }

    if (input.systemPrompt) {
      agentPrompts = {
        task_1: { system_prompt: input.systemPrompt }
      };
    }

    let result = await client.patchAgent(
      input.agentId,
      Object.keys(agentConfig).length > 0 ? agentConfig : undefined,
      agentPrompts
    );

    return {
      output: {
        agentId: input.agentId,
        status: result.state || 'updated'
      },
      message: `Updated agent \`${input.agentId}\` successfully.`
    };
  })
  .build();
