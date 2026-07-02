import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { spec } from '../spec';

export let listBotIssuesTool = SlateTool.create(spec, {
  name: 'List Bot Issues',
  key: 'list_bot_issues',
  description: `List or retrieve issues reported for a bot. Issues help diagnose and track problems with bot behavior and conversation flows.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to config workspaceId.'),
      issueId: z.string().optional().describe('Specific issue ID to retrieve details for'),
      nextToken: z.string().optional().describe('Pagination token for listing')
    })
  )
  .output(
    z.object({
      issue: z.record(z.string(), z.unknown()).optional(),
      issues: z.array(z.record(z.string(), z.unknown())).optional(),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId || ctx.config.workspaceId
    });

    if (ctx.input.issueId) {
      let result = await client.getBotIssue(botId, ctx.input.issueId);
      return {
        output: { issue: result.issue },
        message: `Retrieved issue **${ctx.input.issueId}** for bot **${botId}**.`
      };
    }

    let result = await client.listBotIssues(botId, { nextToken: ctx.input.nextToken });
    let issues = result.issues || [];
    return {
      output: { issues, nextToken: result.meta?.nextToken },
      message: `Found **${issues.length}** issue(s) for bot **${botId}**.`
    };
  })
  .build();
