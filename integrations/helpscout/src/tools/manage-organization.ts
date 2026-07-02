import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageOrganization = SlateTool.create(spec, {
  name: 'Manage Organization',
  key: 'manage_organization',
  description: `List, get, create, update, or delete organizations. Organizations represent companies that can be associated with multiple customers.`
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      organizationId: z
        .number()
        .optional()
        .describe('Organization ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Organization name (required for create, optional for update)'),
      page: z.number().optional().describe('Page number for list action')
    })
  )
  .output(
    z.object({
      organizations: z
        .array(
          z.object({
            organizationId: z.number().describe('Organization ID'),
            name: z.string().describe('Organization name'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            modifiedAt: z.string().optional().describe('Last modified timestamp')
          })
        )
        .optional()
        .describe('List of organizations'),
      organization: z
        .object({
          organizationId: z.number(),
          name: z.string(),
          createdAt: z.string().optional(),
          modifiedAt: z.string().optional()
        })
        .optional()
        .describe('Single organization (for get/create)'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let data = await client.listOrganizations({ page: ctx.input.page });
      let embedded = data?._embedded?.organizations ?? [];
      let organizations = embedded.map((o: any) => ({
        organizationId: o.id,
        name: o.name,
        createdAt: o.createdAt,
        modifiedAt: o.updatedAt
      }));

      return {
        output: { organizations, success: true },
        message: `Found **${organizations.length}** organizations.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.organizationId)
        throw helpscoutServiceError('Organization ID is required');
      let data = await client.getOrganization(ctx.input.organizationId);
      return {
        output: {
          organization: {
            organizationId: data.id,
            name: data.name,
            createdAt: data.createdAt,
            modifiedAt: data.updatedAt
          },
          success: true
        },
        message: `Organization **${data.name}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw helpscoutServiceError('Organization name is required');
      let _result = await client.createOrganization({ name: ctx.input.name });
      return {
        output: { success: true },
        message: `Created organization **"${ctx.input.name}"**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.organizationId)
        throw helpscoutServiceError('Organization ID is required');
      if (!ctx.input.name) throw helpscoutServiceError('Organization name is required');
      await client.updateOrganization(ctx.input.organizationId, { name: ctx.input.name });
      return {
        output: { success: true },
        message: `Updated organization **#${ctx.input.organizationId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.organizationId)
        throw helpscoutServiceError('Organization ID is required');
      await client.deleteOrganization(ctx.input.organizationId);
      return {
        output: { success: true },
        message: `Deleted organization **#${ctx.input.organizationId}**.`
      };
    }

    return { output: { success: false }, message: 'Unknown action.' };
  })
  .build();
