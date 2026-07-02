import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createChange = SlateTool.create(spec, {
  name: 'Create Change',
  key: 'create_change',
  description: `Create a new change request in Freshservice.

Status: 1=Open, 2=Planning, 3=Awaiting Approval, 4=Pending Release, 5=Pending Review, 6=Closed.
Priority: 1=Low, 2=Medium, 3=High, 4=Urgent.
Change Type: 1=Minor, 2=Standard, 3=Major, 4=Emergency.
Risk: 1=Low, 2=Medium, 3=High, 4=Very High.
Impact: 1=Low, 2=Medium, 3=High.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Subject of the change'),
      description: z.string().optional().describe('HTML description'),
      email: z.string().optional().describe('Email of the requester'),
      requesterId: z.number().optional().describe('User ID of the requester'),
      status: z.number().optional().describe('Status (1-6)'),
      priority: z.number().optional().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      impact: z.number().optional().describe('Impact: 1=Low, 2=Medium, 3=High'),
      risk: z.number().optional().describe('Risk: 1=Low, 2=Medium, 3=High, 4=Very High'),
      changeType: z
        .number()
        .optional()
        .describe('Change Type: 1=Minor, 2=Standard, 3=Major, 4=Emergency'),
      groupId: z.number().optional().describe('Agent group ID'),
      agentId: z.number().optional().describe('Assigned agent ID'),
      departmentId: z.number().optional().describe('Department ID'),
      category: z.string().optional().describe('Category'),
      subCategory: z.string().optional().describe('Sub-category'),
      itemCategory: z.string().optional().describe('Item category'),
      plannedStartDate: z.string().optional().describe('Planned start date (ISO 8601)'),
      plannedEndDate: z.string().optional().describe('Planned end date (ISO 8601)'),
      customFields: z.record(z.string(), z.unknown()).optional().describe('Custom fields')
    })
  )
  .output(
    z.object({
      changeId: z.number().describe('ID of the created change'),
      subject: z.string().describe('Subject'),
      status: z.number().describe('Status'),
      priority: z.number().describe('Priority'),
      changeType: z.number().describe('Change type'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let change = await client.createChange(ctx.input);

    return {
      output: {
        changeId: change.id,
        subject: change.subject,
        status: change.status,
        priority: change.priority,
        changeType: change.change_type,
        createdAt: change.created_at
      },
      message: `Created change **#${change.id}**: "${change.subject}"`
    };
  })
  .build();

export let getChange = SlateTool.create(spec, {
  name: 'Get Change',
  key: 'get_change',
  description: `Retrieve a single change request by its ID with all details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      changeId: z.number().describe('ID of the change')
    })
  )
  .output(
    z.object({
      changeId: z.number().describe('ID of the change'),
      subject: z.string().describe('Subject'),
      description: z.string().nullable().describe('HTML description'),
      status: z.number().describe('Status'),
      priority: z.number().describe('Priority'),
      impact: z.number().describe('Impact'),
      risk: z.number().describe('Risk'),
      changeType: z.number().describe('Change type'),
      requesterId: z.number().describe('Requester ID'),
      agentId: z.number().nullable().describe('Assigned agent ID'),
      groupId: z.number().nullable().describe('Assigned group ID'),
      departmentId: z.number().nullable().describe('Department ID'),
      category: z.string().nullable().describe('Category'),
      plannedStartDate: z.string().nullable().describe('Planned start date'),
      plannedEndDate: z.string().nullable().describe('Planned end date'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      customFields: z.record(z.string(), z.unknown()).nullable().describe('Custom fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let change = await client.getChange(ctx.input.changeId);

    return {
      output: {
        changeId: change.id,
        subject: change.subject,
        description: change.description,
        status: change.status,
        priority: change.priority,
        impact: change.impact,
        risk: change.risk,
        changeType: change.change_type,
        requesterId: change.requester_id,
        agentId: change.agent_id,
        groupId: change.group_id,
        departmentId: change.department_id,
        category: change.category,
        plannedStartDate: change.planned_start_date,
        plannedEndDate: change.planned_end_date,
        createdAt: change.created_at,
        updatedAt: change.updated_at,
        customFields: change.custom_fields
      },
      message: `Retrieved change **#${change.id}**: "${change.subject}"`
    };
  })
  .build();

export let listChanges = SlateTool.create(spec, {
  name: 'List Changes',
  key: 'list_changes',
  description: `List change requests in Freshservice with optional filtering and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('Predefined filter name'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 30, max: 100)')
    })
  )
  .output(
    z.object({
      changes: z.array(
        z.object({
          changeId: z.number().describe('ID'),
          subject: z.string().describe('Subject'),
          status: z.number().describe('Status'),
          priority: z.number().describe('Priority'),
          changeType: z.number().describe('Change type'),
          risk: z.number().describe('Risk'),
          agentId: z.number().nullable().describe('Assigned agent ID'),
          groupId: z.number().nullable().describe('Assigned group ID'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listChanges(
      { page: ctx.input.page, perPage: ctx.input.perPage },
      ctx.input.filter
    );

    let changes = result.changes.map((c: Record<string, unknown>) => ({
      changeId: c.id as number,
      subject: c.subject as string,
      status: c.status as number,
      priority: c.priority as number,
      changeType: c.change_type as number,
      risk: c.risk as number,
      agentId: c.agent_id as number | null,
      groupId: c.group_id as number | null,
      createdAt: c.created_at as string,
      updatedAt: c.updated_at as string
    }));

    return {
      output: { changes },
      message: `Found **${changes.length}** changes`
    };
  })
  .build();

export let updateChange = SlateTool.create(spec, {
  name: 'Update Change',
  key: 'update_change',
  description: `Update an existing change request's properties.

Status: 1=Open, 2=Planning, 3=Awaiting Approval, 4=Pending Release, 5=Pending Review, 6=Closed.
Priority: 1=Low, 2=Medium, 3=High, 4=Urgent.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      changeId: z.number().describe('ID of the change to update'),
      subject: z.string().optional().describe('Updated subject'),
      description: z.string().optional().describe('Updated HTML description'),
      status: z.number().optional().describe('Status (1-6)'),
      priority: z.number().optional().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      impact: z.number().optional().describe('Impact: 1=Low, 2=Medium, 3=High'),
      risk: z.number().optional().describe('Risk: 1=Low, 2=Medium, 3=High, 4=Very High'),
      changeType: z
        .number()
        .optional()
        .describe('Change Type: 1=Minor, 2=Standard, 3=Major, 4=Emergency'),
      groupId: z.number().optional().describe('Agent group ID'),
      agentId: z.number().optional().describe('Assigned agent ID'),
      departmentId: z.number().optional().describe('Department ID'),
      category: z.string().optional().describe('Category'),
      subCategory: z.string().optional().describe('Sub-category'),
      itemCategory: z.string().optional().describe('Item category'),
      plannedStartDate: z.string().optional().describe('Planned start date (ISO 8601)'),
      plannedEndDate: z.string().optional().describe('Planned end date (ISO 8601)'),
      customFields: z.record(z.string(), z.unknown()).optional().describe('Custom fields')
    })
  )
  .output(
    z.object({
      changeId: z.number().describe('ID of the updated change'),
      subject: z.string().describe('Subject'),
      status: z.number().describe('Status'),
      priority: z.number().describe('Priority'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let { changeId, ...updateParams } = ctx.input;
    let change = await client.updateChange(changeId, updateParams);

    return {
      output: {
        changeId: change.id,
        subject: change.subject,
        status: change.status,
        priority: change.priority,
        updatedAt: change.updated_at
      },
      message: `Updated change **#${change.id}**: "${change.subject}"`
    };
  })
  .build();

export let deleteChange = SlateTool.create(spec, {
  name: 'Delete Change',
  key: 'delete_change',
  description: `Permanently delete a change request by its ID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      changeId: z.number().describe('ID of the change to delete')
    })
  )
  .output(
    z.object({
      changeId: z.number().describe('ID of the deleted change'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    await client.deleteChange(ctx.input.changeId);

    return {
      output: {
        changeId: ctx.input.changeId,
        deleted: true
      },
      message: `Deleted change **#${ctx.input.changeId}**`
    };
  })
  .build();
