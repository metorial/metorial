import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCurrentMember = SlateTool.create(spec, {
  name: 'Get Current Member',
  key: 'get_current_member',
  description:
    'Retrieves the authenticated member and their current workspace, role, and default workflow.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      memberId: z.string().describe('UUID of the authenticated member'),
      name: z.string().describe('Member display name'),
      mentionName: z.string().describe('Member mention handle'),
      role: z.string().describe('Role in the workspace'),
      isOwner: z.boolean().describe('Whether the member owns the workspace'),
      workspaceId: z.string().describe('UUID of the current workspace'),
      workspaceName: z.string().describe('Name of the current workspace'),
      workspaceSlug: z.string().describe('Workspace URL slug'),
      defaultWorkflowId: z
        .number()
        .describe('Default workflow ID; call list_workflows to discover its states'),
      organizationId: z.string().describe('UUID of the organization')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let member = await client.getCurrentMember();
    return {
      output: {
        memberId: member.id,
        name: member.name,
        mentionName: member.mention_name,
        role: member.role,
        isOwner: member.is_owner,
        workspaceId: member.workspace2.id,
        workspaceName: member.workspace2.name,
        workspaceSlug: member.workspace2.url_slug,
        defaultWorkflowId: member.workspace2.default_workflow_id,
        organizationId: member.organization2.id
      },
      message: `Authenticated as **${member.name}** in **${member.workspace2.name}**`
    };
  })
  .build();
