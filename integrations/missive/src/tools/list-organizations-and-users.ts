import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrganizationsAndUsers = SlateTool.create(spec, {
  name: 'List Organizations and Users',
  key: 'list_organizations_and_users',
  description: `Retrieve organizations the authenticated user belongs to, and/or users within those organizations. Useful for discovering resource IDs for use in other actions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeOrganizations: z
        .boolean()
        .optional()
        .describe('Include organizations in the result'),
      includeUsers: z.boolean().optional().describe('Include users in the result'),
      limit: z.number().min(1).max(200).optional().describe('Max items to return per type'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      organizations: z
        .array(
          z.object({
            organizationId: z.string().describe('Organization ID'),
            name: z.string().optional().describe('Organization name')
          })
        )
        .optional(),
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            name: z.string().optional().describe('User display name'),
            email: z.string().optional().describe('User email address'),
            avatarUrl: z.string().optional().describe('User avatar URL')
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let params: Record<string, string | number> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result: any = {};
    let messages: string[] = [];

    if (ctx.input.includeOrganizations !== false) {
      let orgData = await client.listOrganizations(params);
      result.organizations = (orgData.organizations || []).map((o: any) => ({
        organizationId: o.id,
        name: o.name
      }));
      messages.push(`**${result.organizations.length}** organizations`);
    }

    if (ctx.input.includeUsers !== false) {
      let userData = await client.listUsers(params);
      result.users = (userData.users || []).map((u: any) => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatar_url
      }));
      messages.push(`**${result.users.length}** users`);
    }

    return {
      output: result,
      message: `Retrieved ${messages.join(' and ')}.`
    };
  })
  .build();
