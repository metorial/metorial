import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrgMembers = SlateTool.create(spec, {
  name: 'List Organization Members',
  key: 'list_org_members',
  description: `List members of a Docker Hub organization, including their roles and team memberships. Supports pagination for large organizations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      page: z.number().optional().describe('Page number for pagination (starts at 1).'),
      pageSize: z.number().optional().describe('Number of results per page (default 25).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of members.'),
      members: z.array(
        z.object({
          username: z.string().describe('Docker Hub username.'),
          fullName: z.string().describe('Full name of the member.'),
          email: z.string().describe('Email address.'),
          role: z.string().describe('Role in the organization (owner, member).'),
          dateJoined: z.string().describe('ISO timestamp when the member joined.'),
          teams: z.array(z.string()).describe('List of team names the member belongs to.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listOrgMembers(ctx.input.orgName, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        members: result.results.map(m => ({
          username: m.username,
          fullName: m.full_name || '',
          email: m.email || '',
          role: m.role,
          dateJoined: m.date_joined,
          teams: m.groups || []
        }))
      },
      message: `Found **${result.count}** members in organization **${ctx.input.orgName}**.`
    };
  })
  .build();

export let removeOrgMember = SlateTool.create(spec, {
  name: 'Remove Organization Member',
  key: 'remove_org_member',
  description: `Remove a member from a Docker Hub organization. The user will lose access to all organization repositories and teams.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgName: z.string().describe('Name of the Docker Hub organization.'),
      username: z.string().describe('Docker Hub username of the member to remove.')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the member was successfully removed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.removeOrgMember(ctx.input.orgName, ctx.input.username);

    return {
      output: { removed: true },
      message: `Removed **${ctx.input.username}** from organization **${ctx.input.orgName}**.`
    };
  })
  .build();
