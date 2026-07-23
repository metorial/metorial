import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Identify the Slack user or bot connected to this integration and the workspace where it is authenticated.',
  instructions: [
    'Use this before self-relative searches or writes when the connected Slack actor or workspace is unknown.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      actorType: z
        .enum(['bot', 'user'])
        .describe('Whether the authenticated Slack actor is a bot or user'),
      actorUserId: z
        .string()
        .optional()
        .describe('Slack user ID representing the authenticated actor'),
      actorName: z.string().optional().describe('Slack name of the authenticated actor'),
      botId: z.string().optional().describe('Slack bot ID when the actor is a bot'),
      connectedUserId: z
        .string()
        .optional()
        .describe(
          'User ID stored on the connection, including the installing user when known'
        ),
      connectedBotUserId: z
        .string()
        .optional()
        .describe('Bot user ID stored on the connection when known'),
      teamId: z.string().optional().describe('Slack workspace team ID'),
      teamName: z.string().optional().describe('Slack workspace name'),
      workspaceUrl: z.string().optional().describe('Slack workspace URL'),
      enterpriseId: z
        .string()
        .optional()
        .describe('Enterprise Grid organization ID when applicable'),
      isEnterpriseInstall: z
        .boolean()
        .optional()
        .describe('Whether the connection is installed at Enterprise Grid level')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let identity = await client.authTest();
    let actorType = ctx.auth.actorType ?? (identity.bot_id ? 'bot' : 'user');
    let actorUserId =
      identity.user_id ?? (actorType === 'bot' ? ctx.auth.botUserId : ctx.auth.userId);
    let teamId = identity.team_id ?? ctx.auth.teamId;
    let teamName = identity.team ?? ctx.auth.teamName;

    return {
      output: {
        actorType,
        actorUserId,
        actorName: identity.user,
        botId: identity.bot_id,
        connectedUserId: ctx.auth.userId,
        connectedBotUserId: ctx.auth.botUserId,
        teamId,
        teamName,
        workspaceUrl: identity.url,
        enterpriseId: identity.enterprise_id,
        isEnterpriseInstall: identity.is_enterprise_install
      },
      message: `Connected as **${identity.user ?? actorUserId ?? actorType}** (${actorType})${teamName ? ` in **${teamName}**` : ''}.`
    };
  })
  .build();
