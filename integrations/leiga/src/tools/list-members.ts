import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrgMembersTool = SlateTool.create(spec, {
  name: 'List Organization Members',
  key: 'list_org_members',
  description: `List all members in the organization. Useful for finding user IDs when assigning issues or managing project membership.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().default(1).describe('Page number'),
      pageSize: z.number().optional().default(50).describe('Members per page')
    })
  )
  .output(
    z.object({
      members: z.array(z.any()).describe('List of organization members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listOrgMembers(ctx.input.pageNumber, ctx.input.pageSize);

    let members = Array.isArray(response.data)
      ? response.data
      : (response.data as any)?.list || [];

    return {
      output: { members },
      message: `Found **${members.length}** member(s).`
    };
  })
  .build();

export let listProjectMembersTool = SlateTool.create(spec, {
  name: 'List Project Members',
  key: 'list_project_members',
  description: `List all members of a specific project with their roles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID')
    })
  )
  .output(
    z.object({
      members: z.array(z.any()).describe('List of project members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listProjectMembers(ctx.input.projectId);

    let members = response.data || [];

    return {
      output: { members },
      message: `Found **${members.length}** member(s) in project #${ctx.input.projectId}.`
    };
  })
  .build();
