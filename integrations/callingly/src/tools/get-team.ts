import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeam = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description:
    'Retrieve a team’s call routing, retry, recording, whisper text, and automatic SMS settings. Use list_teams to discover team IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover team IDs.')
    })
  )
  .output(
    z.object({
      teamId: z.string().describe('Team ID'),
      accountId: z.string().optional().describe('Account ID'),
      name: z.string().optional().describe('Team name'),
      callMode: z.string().optional().describe('Call routing mode'),
      isRecord: z.boolean().optional().describe('Whether calls are recorded'),
      whisperText: z.string().optional().describe('Message played before connecting'),
      postWhisperText: z.string().optional().describe('Message played after a call'),
      language: z.string().optional().describe('Team language'),
      delay: z.number().optional().describe('Delay before calling, in seconds'),
      isRetry: z.boolean().optional().describe('Whether agent-side retries are enabled'),
      retries: z.number().optional().describe('Number of agent-side retries'),
      retrySchedule: z
        .array(z.number())
        .optional()
        .describe('Agent retry intervals in minutes'),
      isReschedule: z.boolean().optional().describe('Whether rescheduling is enabled'),
      isRetryLead: z.boolean().optional().describe('Whether lead-side retries are enabled'),
      leadRetries: z.number().optional().describe('Number of lead-side retries'),
      leadRetrySchedule: z
        .array(z.number())
        .optional()
        .describe('Lead retry intervals in minutes'),
      smsAutoSend: z.boolean().optional().describe('Whether automatic SMS is enabled'),
      smsBody: z.string().optional().describe('Automatic SMS body'),
      whisperTextVoice: z.string().optional().describe('Voice used for whisper text'),
      isUsersAvailableForCall: z
        .boolean()
        .optional()
        .describe('Whether users are available for calls')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountId: ctx.config.accountId });
    let team = await client.getTeam(ctx.input.teamId);
    if (team?.id == null) {
      throw createApiServiceError('Callingly returned a team without an ID.');
    }
    return {
      output: {
        teamId: String(team.id),
        accountId: team.account_id == null ? undefined : String(team.account_id),
        name: team.name ?? undefined,
        callMode: team.call_mode ?? undefined,
        isRecord: team.is_record == null ? undefined : !!team.is_record,
        whisperText: team.whispertext ?? undefined,
        postWhisperText: team.post_whispertext ?? undefined,
        language: team.language ?? undefined,
        delay: team.delay ?? undefined,
        isRetry: team.is_retry == null ? undefined : !!team.is_retry,
        retries: team.retries ?? undefined,
        retrySchedule: team.retry_schedule ?? undefined,
        isReschedule: team.is_reschedule == null ? undefined : !!team.is_reschedule,
        isRetryLead: team.is_retry_lead == null ? undefined : !!team.is_retry_lead,
        leadRetries: team.lead_retries ?? undefined,
        leadRetrySchedule: team.lead_retry_schedule ?? undefined,
        smsAutoSend: team.is_sms == null ? undefined : !!team.is_sms,
        smsBody: team.sms_body ?? undefined,
        whisperTextVoice: team.whispertext_voice ?? undefined,
        isUsersAvailableForCall: team.is_users_available_for_call ?? undefined
      },
      message: `Retrieved team **${team.name ?? team.id}**.`
    };
  })
  .build();
