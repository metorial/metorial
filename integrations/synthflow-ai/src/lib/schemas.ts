import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';

export const paginationSchema = z.object({
  totalRecords: z.number().optional(),
  limit: z.number().optional(),
  offset: z.number().optional()
});

export const agentSettingsSchema = z.object({
  prompt: z.string().optional().describe('Instructions for the agent'),
  greeting: z.string().optional().describe('Opening message; alias for greetingMessage'),
  greetingMessage: z.string().optional().describe('Opening message'),
  voice: z.string().optional().describe('Voice ID; alias for voiceId'),
  voiceId: z.string().optional().describe('Voice ID from list_voices'),
  language: z.string().optional().describe('Supported language locale, such as en-US'),
  llm: z.string().optional().describe('Supported model, such as gpt-4.1-mini'),
  greetingMode: z
    .enum(['human', 'agent_static', 'agent_dynamic'])
    .optional()
    .describe('Wait for the human, speak the opening message, or generate a greeting'),
  timezone: z.string().optional().describe('IANA timezone, such as Europe/Berlin'),
  redactPii: z
    .boolean()
    .optional()
    .describe('Redact personal information from transcripts and logs'),
  allowedIdleTimeSeconds: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Disconnect after this many idle seconds'),
  voiceSpeed: z.number().positive().optional().describe('Voice speed multiplier')
});

export const mapAgentSettings = (settings: z.infer<typeof agentSettingsSchema>) => {
  if (
    settings.greeting !== undefined &&
    settings.greetingMessage !== undefined &&
    settings.greeting !== settings.greetingMessage
  )
    throw createApiServiceError(
      'Use greetingMessage or greeting with the same value, not conflicting values.'
    );
  if (
    settings.voice !== undefined &&
    settings.voiceId !== undefined &&
    settings.voice !== settings.voiceId
  )
    throw createApiServiceError(
      'Use voiceId or voice with the same value, not conflicting values.'
    );
  return pickDefined({
    prompt: settings.prompt,
    greeting_message: settings.greetingMessage ?? settings.greeting,
    voice_id: settings.voiceId ?? settings.voice,
    language: settings.language,
    llm: settings.llm,
    greeting_message_mode: settings.greetingMode,
    timezone: settings.timezone,
    redact_pii: settings.redactPii,
    allowed_idle_time_seconds: settings.allowedIdleTimeSeconds,
    voice_speed: settings.voiceSpeed
  });
};

export const workspaceSchema = z
  .string()
  .min(1)
  .describe(
    'Workspace ID. Get workspace_id from manage_contact (get/list) or run_simulation (list), or find it in your Synthflow dashboard.'
  );
