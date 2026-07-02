import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let manageOrganizationMembersTool = SlateTool.create(spec, {
  name: 'Manage Organization Members',
  key: 'manage_organization_members',
  description: `List, add, or remove members from an organization. Members are Auth0 users associated with an organization for multi-tenant B2B scenarios.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('The organization ID'),
      action: z.enum(['list', 'add', 'remove']).describe('Action to perform'),
      userIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to add or remove (required for add/remove)'),
      page: z.number().optional().describe('Page number (for list action)'),
      perPage: z.number().optional().describe('Results per page (for list action)')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            userId: z.string(),
            email: z.string().optional(),
            name: z.string().optional(),
            picture: z.string().optional()
          })
        )
        .optional()
        .describe('Organization members (for list action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    if (ctx.input.action === 'list') {
      let result = await client.listOrganizationMembers(ctx.input.organizationId, {
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let members = (Array.isArray(result) ? result : (result.members ?? [])).map(
        (m: any) => ({
          userId: m.user_id,
          email: m.email,
          name: m.name,
          picture: m.picture
        })
      );
      return {
        output: { members, success: true },
        message: `Organization has **${members.length}** member(s).`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.userIds?.length) throw new Error('userIds are required for add action');
      await client.addOrganizationMembers(ctx.input.organizationId, ctx.input.userIds);
      return {
        output: { success: true },
        message: `Added **${ctx.input.userIds.length}** member(s) to organization.`
      };
    }

    if (ctx.input.action === 'remove') {
      if (!ctx.input.userIds?.length)
        throw new Error('userIds are required for remove action');
      await client.removeOrganizationMembers(ctx.input.organizationId, ctx.input.userIds);
      return {
        output: { success: true },
        message: `Removed **${ctx.input.userIds.length}** member(s) from organization.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
