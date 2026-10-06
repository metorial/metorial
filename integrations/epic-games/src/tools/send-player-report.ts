import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { gameClient } from '../lib/client';
import { identifier, time } from '../lib/validation';
import { spec } from '../spec';

export let sendPlayerReport = SlateTool.create(spec, {
  name: 'Send Player Report',
  key: 'send_player_report',
  description: `Submit a player report for misconduct. Reports are used to flag players for cheating, exploiting, verbal abuse, scamming, spamming, offensive profiles, or other negative behavior.
Reports feed into moderation workflows and can be queried via the **Find Player Reports** tool.`,
  instructions: [
    'Use the standard reason IDs: 1=Cheating, 2=Exploiting, 3=Offensive Profile, 4=Verbal Abuse, 5=Scamming, 6=Spamming, 7=Other'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      reportingPlayerId: z
        .string()
        .describe('Product User ID of the player making the report'),
      reportedPlayerId: z.string().describe('Product User ID of the player being reported'),
      reasonId: z
        .number()
        .int()
        .min(1)
        .max(7)
        .describe(
          'Report reason: 1=Cheating, 2=Exploiting, 3=Offensive Profile, 4=Verbal Abuse, 5=Scamming, 6=Spamming, 7=Other'
        ),
      message: z
        .string()
        .max(1024)
        .optional()
        .describe('Additional message/details from the reporter'),
      context: z
        .string()
        .max(4096)
        .optional()
        .describe('JSON string with additional context about the incident'),
      time: z
        .string()
        .optional()
        .describe('When the incident occurred (ISO 8601). Defaults to current time.')
    })
  )
  .output(
    z.object({
      outcome: z
        .literal('accepted')
        .optional()
        .describe('The provider accepted the request; downstream effects are not verified.'),
      submitted: z.boolean().describe('Whether the report was successfully submitted')
    })
  )
  .handleInvocation(async ctx => {
    identifier(ctx.input.reportingPlayerId, 'Reporting player');
    identifier(ctx.input.reportedPlayerId, 'Reported player');
    if (ctx.input.reportingPlayerId === ctx.input.reportedPlayerId)
      throw createApiServiceError('A player cannot report themselves.');
    const reportTime = ctx.input.time ?? new Date().toISOString();
    time(reportTime, 'Report time');
    if (ctx.input.context !== undefined) {
      try {
        JSON.parse(ctx.input.context);
      } catch {
        throw createApiServiceError('context must contain valid JSON text.');
      }
    }
    await gameClient(ctx).sendPlayerReport({ ...ctx.input, time: reportTime });
    return {
      output: { submitted: true, outcome: 'accepted' as const },
      message:
        'Epic accepted the player report. This retains moderation history and may trigger disciplinary workflows; no moderation completion or undo is claimed.'
    };
  })
  .build();
