import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWorkspaceMembersTool = SlateTool.create(spec, {
  name: 'List Workspace Members',
  key: 'list_workspace_members',
  description: `List all members in the configured workspace. Returns user display names, UUIDs, and account IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      pageLen: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          userUuid: z.string().optional(),
          displayName: z.string(),
          accountId: z.string().optional(),
          nickname: z.string().optional(),
          imageUrl: z.string().optional()
        })
      ),
      hasNextPage: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let result = await client.listWorkspaceMembers({
      page: ctx.input.page,
      pageLen: ctx.input.pageLen
    });

    let members = (result.values || []).map((m: any) => ({
      userUuid: m.user?.uuid || undefined,
      displayName: m.user?.display_name || m.display_name || '',
      accountId: m.user?.account_id || undefined,
      nickname: m.user?.nickname || undefined,
      imageUrl: m.user?.links?.avatar?.href || undefined
    }));

    return {
      output: {
        members,
        hasNextPage: !!result.next
      },
      message: `Found **${members.length}** workspace members.`
    };
  })
  .build();
