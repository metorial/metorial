import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTeam = SlateTool.create(spec, {
  name: 'Manage Team',
  key: 'manage_team',
  description: `Create a new team or update an existing team's settings. Configure call mode, whisper text, post-whisper text, retry settings, recording, call delay, language, and auto-SMS.
- To **create** a team, omit the teamId and provide a name.
- To **update** a team, provide the teamId along with the fields to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      teamId: z
        .string()
        .optional()
        .describe('ID of the team to update. Omit to create a new team.'),
      name: z.string().optional().describe('Team name (required when creating)'),
      callMode: z.string().optional().describe('Call mode (e.g., "simultaneous")'),
      whisperText: z
        .string()
        .optional()
        .describe(
          'Message agents hear before connecting. Supports variables like {{lead.first_name}}'
        ),
      postWhisperText: z.string().optional().describe('Message after a call for disposition'),
      isRecord: z.boolean().optional().describe('Enable or disable call recording'),
      delay: z.number().optional().describe('Call delay in seconds before initiating'),
      language: z.string().optional().describe('Language setting for the team'),
      retries: z.number().optional().describe('Number of agent-side retries'),
      retrySchedule: z
        .string()
        .optional()
        .describe('Retry schedule in minutes (comma-separated)'),
      leadRetries: z.number().optional().describe('Number of lead-side retries'),
      leadRetrySchedule: z
        .string()
        .optional()
        .describe('Lead retry schedule in minutes (comma-separated)'),
      smsAutoSend: z.boolean().optional().describe('Enable or disable auto-SMS'),
      smsBody: z.string().optional().describe('Auto-SMS body text')
    })
  )
  .output(
    z.object({
      teamId: z.string().describe('ID of the team'),
      name: z.string().optional().describe('Team name'),
      callMode: z.string().optional().describe('Call mode'),
      isRecord: z.boolean().optional().describe('Whether recording is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.callMode !== undefined) data.call_mode = ctx.input.callMode;
    if (ctx.input.whisperText !== undefined) data.whispertext = ctx.input.whisperText;
    if (ctx.input.postWhisperText !== undefined)
      data.post_whispertext = ctx.input.postWhisperText;
    if (ctx.input.isRecord !== undefined) data.is_record = ctx.input.isRecord;
    if (ctx.input.delay !== undefined) data.delay = ctx.input.delay;
    if (ctx.input.language !== undefined) data.language = ctx.input.language;
    if (ctx.input.retries !== undefined) data.retries = ctx.input.retries;
    if (ctx.input.retrySchedule !== undefined) data.retry_schedule = ctx.input.retrySchedule;
    if (ctx.input.leadRetries !== undefined) data.lead_retries = ctx.input.leadRetries;
    if (ctx.input.leadRetrySchedule !== undefined)
      data.lead_retry_schedule = ctx.input.leadRetrySchedule;
    if (ctx.input.smsAutoSend !== undefined) data.sms_auto_send = ctx.input.smsAutoSend;
    if (ctx.input.smsBody !== undefined) data.sms_body = ctx.input.smsBody;

    let result: any;
    let action: string;

    if (ctx.input.teamId) {
      result = await client.updateTeam(ctx.input.teamId, data);
      action = 'updated';
    } else {
      result = await client.createTeam(data);
      action = 'created';
    }

    return {
      output: {
        teamId: String(result.id),
        name: result.name,
        callMode: result.call_mode,
        isRecord: result.is_record
      },
      message: `Team **${result.name ?? result.id}** ${action} successfully.`
    };
  })
  .build();
