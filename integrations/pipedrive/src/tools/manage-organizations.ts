import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageOrganizations = SlateTool.create(spec, {
  name: 'Manage Organizations',
  key: 'manage_organizations',
  description: `Create, update, or delete organizations in Pipedrive. Organizations represent companies or entities that can be linked to persons and deals.
Supports setting name, address, visibility, and custom fields.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      organizationId: z
        .number()
        .optional()
        .describe('Organization ID (required for update and delete)'),
      name: z.string().optional().describe('Organization name (required for create)'),
      address: z.string().optional().describe('Full address'),
      visibleTo: z
        .enum(['1', '3', '5', '7'])
        .optional()
        .describe('Visibility: 1=owner, 3=group, 5=group+sub, 7=company'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by field API key')
    })
  )
  .output(
    z.object({
      organizationId: z.number().describe('Organization ID'),
      name: z.string().optional().describe('Organization name'),
      address: z.string().optional().nullable().describe('Organization address'),
      ownerName: z.string().optional().describe('Owner user name'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      openDealsCount: z.number().optional().describe('Number of open deals'),
      peopleCount: z.number().optional().describe('Number of linked persons'),
      deleted: z.boolean().optional().describe('Whether the organization was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.action === 'delete') {
      if (!ctx.input.organizationId)
        throw pipedriveServiceError('organizationId is required for delete action');
      await client.deleteOrganization(ctx.input.organizationId);
      return {
        output: { organizationId: ctx.input.organizationId, deleted: true },
        message: `Organization **#${ctx.input.organizationId}** has been deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.address) body.address = ctx.input.address;
    if (ctx.input.visibleTo) body.visible_to = ctx.input.visibleTo;
    if (ctx.input.customFields) {
      Object.assign(body, ctx.input.customFields);
    }

    let result: any;
    if (ctx.input.action === 'create') {
      result = await client.createOrganization(body);
    } else {
      if (!ctx.input.organizationId)
        throw pipedriveServiceError('organizationId is required for update action');
      result = await client.updateOrganization(ctx.input.organizationId, body);
    }

    let org = result?.data;
    let action = ctx.input.action === 'create' ? 'created' : 'updated';

    return {
      output: {
        organizationId: org?.id,
        name: org?.name,
        address: org?.address,
        ownerName: org?.owner_id?.name ?? org?.owner_name,
        addTime: org?.add_time,
        updateTime: org?.update_time,
        openDealsCount: org?.open_deals_count,
        peopleCount: org?.people_count
      },
      message: `Organization **"${org?.name}"** (ID: ${org?.id}) has been ${action}.`
    };
  });
