import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageResource = SlateTool.create(spec, {
  name: 'Manage Resource',
  key: 'manage_resource',
  description: `Create, update, or delete a resource (team member) in Hub Planner.
When creating, **firstName** is required. Resources can have statuses like Active, Archived, Non-Bookable, or Parked.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      resourceId: z
        .string()
        .optional()
        .describe('Resource ID, required for update and delete'),
      firstName: z.string().optional().describe('First name, required for create'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address (must be unique)'),
      status: z
        .enum(['STATUS_ACTIVE', 'STATUS_ARCHIVED', 'STATUS_NON_BOOKABLE', 'STATUS_PARKED'])
        .optional()
        .describe('Resource status'),
      role: z.string().optional().describe('Resource role'),
      note: z.string().optional().describe('Resource notes'),
      metadata: z.string().optional().describe('Custom metadata (max 255 chars)'),
      sendInviteEmail: z.boolean().optional().describe('Send invitation email on create')
    })
  )
  .output(
    z.object({
      resourceId: z.string().optional().describe('Resource ID'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email'),
      status: z.string().optional().describe('Resource status'),
      role: z.string().optional().describe('Role'),
      createdDate: z.string().optional().describe('Creation timestamp'),
      updatedDate: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, resourceId, ...fields } = ctx.input;

    if (action === 'create') {
      let result = await client.createResource(fields);
      return {
        output: {
          resourceId: result._id,
          firstName: result.firstName,
          lastName: result.lastName,
          email: result.email,
          status: result.status,
          role: result.role,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created resource **${result.firstName} ${result.lastName || ''}** (ID: \`${result._id}\`).`
      };
    }

    if (action === 'update') {
      if (!resourceId) throw new Error('resourceId is required for update');
      let result = await client.updateResource(resourceId, fields);
      let resource = Array.isArray(result) ? result[0] : result;
      return {
        output: {
          resourceId: resource._id,
          firstName: resource.firstName,
          lastName: resource.lastName,
          email: resource.email,
          status: resource.status,
          role: resource.role,
          createdDate: resource.createdDate,
          updatedDate: resource.updatedDate
        },
        message: `Updated resource **${resource.firstName} ${resource.lastName || ''}** (ID: \`${resource._id}\`).`
      };
    }

    if (!resourceId) throw new Error('resourceId is required for delete');
    await client.deleteResource(resourceId);
    return {
      output: { resourceId },
      message: `Deleted resource \`${resourceId}\`.`
    };
  })
  .build();
