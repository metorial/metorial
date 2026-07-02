import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let manageOrganizationTool = SlateTool.create(spec, {
  name: 'Manage Organization',
  key: 'manage_organization',
  description: `Create, list, get, or delete organizations. Also manage organization members by adding or removing users. Organizations group customers for service desk access management.`,
  instructions: [
    'Set action to "list" to list all organizations.',
    'Set action to "get" to retrieve a specific organization and its members.',
    'Set action to "create" to create a new organization (requires organizationName).',
    'Set action to "delete" to delete an organization (requires organizationId).',
    'Set action to "add_users" or "remove_users" to manage membership (requires organizationId and userAccountIds).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'delete', 'add_users', 'remove_users'])
        .describe('Action to perform'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (required for get, delete, add_users, remove_users)'),
      organizationName: z
        .string()
        .optional()
        .describe('Name for the new organization (required for create)'),
      userAccountIds: z
        .array(z.string())
        .optional()
        .describe('Account IDs to add or remove (required for add_users, remove_users)'),
      start: z.number().optional().describe('Pagination start index'),
      limit: z.number().optional().describe('Pagination limit')
    })
  )
  .output(
    z.object({
      organizations: z
        .array(
          z.object({
            organizationId: z.string().describe('Organization ID'),
            name: z.string().describe('Organization name')
          })
        )
        .optional()
        .describe('List of organizations'),
      organization: z
        .object({
          organizationId: z.string().describe('Organization ID'),
          name: z.string().describe('Organization name'),
          members: z
            .array(
              z.object({
                accountId: z.string().optional(),
                displayName: z.string().optional(),
                emailAddress: z.string().optional()
              })
            )
            .optional()
            .describe('Organization members')
        })
        .optional()
        .describe('Single organization details'),
      deleted: z.boolean().optional().describe('Whether the organization was deleted'),
      membersUpdated: z.boolean().optional().describe('Whether members were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.getOrganizations(ctx.input.start, ctx.input.limit);
      let organizations = (result.values || []).map((org: any) => ({
        organizationId: String(org.id),
        name: org.name
      }));

      return {
        output: { organizations },
        message: `Found **${organizations.length}** organizations.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.organizationId)
        throw new Error('organizationId is required for get action');

      let org = await client.getOrganization(ctx.input.organizationId);
      let usersResult = await client.getOrganizationUsers(ctx.input.organizationId);

      let members = (usersResult.values || []).map((u: any) => ({
        accountId: u.accountId,
        displayName: u.displayName,
        emailAddress: u.emailAddress
      }));

      return {
        output: {
          organization: {
            organizationId: String(org.id),
            name: org.name,
            members
          }
        },
        message: `Organization "${org.name}" has **${members.length}** members.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.organizationName)
        throw new Error('organizationName is required for create action');

      let result = await client.createOrganization(ctx.input.organizationName);

      return {
        output: {
          organization: {
            organizationId: String(result.id),
            name: result.name
          }
        },
        message: `Created organization "${result.name}" (ID: ${result.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.organizationId)
        throw new Error('organizationId is required for delete action');

      await client.deleteOrganization(ctx.input.organizationId);

      return {
        output: { deleted: true },
        message: `Deleted organization ${ctx.input.organizationId}.`
      };
    }

    if (action === 'add_users') {
      if (!ctx.input.organizationId) throw new Error('organizationId is required');
      if (!ctx.input.userAccountIds?.length) throw new Error('userAccountIds are required');

      await client.addUsersToOrganization(ctx.input.organizationId, ctx.input.userAccountIds);

      return {
        output: { membersUpdated: true },
        message: `Added **${ctx.input.userAccountIds.length}** users to organization ${ctx.input.organizationId}.`
      };
    }

    if (action === 'remove_users') {
      if (!ctx.input.organizationId) throw new Error('organizationId is required');
      if (!ctx.input.userAccountIds?.length) throw new Error('userAccountIds are required');

      await client.removeUsersFromOrganization(
        ctx.input.organizationId,
        ctx.input.userAccountIds
      );

      return {
        output: { membersUpdated: true },
        message: `Removed **${ctx.input.userAccountIds.length}** users from organization ${ctx.input.organizationId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
