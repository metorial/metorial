import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import {
  botIdSchema,
  resolveBotId,
  resolveWorkspaceId,
  workspaceIdSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listBotIssuesTool = SlateTool.create(spec, {
  name: 'List Bot Issues',
  key: 'list_bot_issues',
  description: `List or retrieve issues reported for a bot. Issues help diagnose and track problems with bot behavior and conversation flows. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: botIdSchema,
      workspaceId: workspaceIdSchema,
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
    let botId = resolveBotId(ctx.input.botId, ctx.config);

    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: resolveWorkspaceId(ctx.input.workspaceId, ctx.config)
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
