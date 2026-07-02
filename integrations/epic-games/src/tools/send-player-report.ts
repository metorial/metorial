import { SlateTool } from 'slates';
import { z } from 'zod';
import { EosGameServicesClient } from '../lib/client';
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
      submitted: z.boolean().describe('Whether the report was successfully submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EosGameServicesClient({
      token: ctx.auth.token,
      deploymentId: ctx.config.deploymentId
    });

    let reportTime = ctx.input.time ?? new Date().toISOString();

    await client.sendPlayerReport({
      reportingPlayerId: ctx.input.reportingPlayerId,
      reportedPlayerId: ctx.input.reportedPlayerId,
      time: reportTime,
      reasonId: ctx.input.reasonId,
      message: ctx.input.message,
      context: ctx.input.context
    });

    return {
      output: { submitted: true },
      message: `Player report submitted: \`${ctx.input.reportingPlayerId}\` reported \`${ctx.input.reportedPlayerId}\` for reason **${ctx.input.reasonId}**.`
    };
  })
  .build();
