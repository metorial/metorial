import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let changeUpdates = SlateTrigger.create(spec, {
  name: 'Change Updates',
  key: 'change_updates',
  description:
    'Triggers when change requests are created or updated in Freshservice. Polls for recently modified changes.'
})
  .input(
    z.object({
      changeId: z.number().describe('ID of the change'),
      subject: z.string().describe('Subject of the change'),
      status: z.number().describe('Status'),
      priority: z.number().describe('Priority'),
      changeType: z.number().describe('Change type'),
      risk: z.number().describe('Risk level'),
      impact: z.number().describe('Impact level'),
      requesterId: z.number().describe('Requester ID'),
      agentId: z.number().nullable().describe('Assigned agent ID'),
      groupId: z.number().nullable().describe('Assigned group ID'),
      departmentId: z.number().nullable().describe('Department ID'),
      category: z.string().nullable().describe('Category'),
      plannedStartDate: z.string().nullable().describe('Planned start date'),
      plannedEndDate: z.string().nullable().describe('Planned end date'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      isNew: z.boolean().describe('Whether the change was just created')
    })
  )
  .output(
    z.object({
      changeId: z.number().describe('ID of the change'),
      subject: z.string().describe('Subject of the change'),
      status: z
        .number()
        .describe(
          'Status: 1=Open, 2=Planning, 3=Awaiting Approval, 4=Pending Release, 5=Pending Review, 6=Closed'
        ),
      priority: z.number().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      changeType: z
        .number()
        .describe('Change type: 1=Minor, 2=Standard, 3=Major, 4=Emergency'),
      risk: z.number().describe('Risk: 1=Low, 2=Medium, 3=High, 4=Very High'),
      impact: z.number().describe('Impact: 1=Low, 2=Medium, 3=High'),
      requesterId: z.number().describe('Requester ID'),
      agentId: z.number().nullable().describe('Assigned agent ID'),
      groupId: z.number().nullable().describe('Assigned group ID'),
      departmentId: z.number().nullable().describe('Department ID'),
      category: z.string().nullable().describe('Category'),
      plannedStartDate: z.string().nullable().describe('Planned start date'),
      plannedEndDate: z.string().nullable().describe('Planned end date'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain,
        authType: ctx.auth.authType
      });

      let knownChangeIds =
        ((ctx.state as Record<string, unknown>)?.knownChangeIds as number[]) || [];

      let result = await client.listChanges({ page: 1, perPage: 100 });
      let changes = result.changes || [];

      let inputs = changes.map((c: Record<string, unknown>) => ({
        changeId: c.id as number,
        subject: c.subject as string,
        status: c.status as number,
        priority: c.priority as number,
        changeType: c.change_type as number,
        risk: c.risk as number,
        impact: c.impact as number,
        requesterId: c.requester_id as number,
        agentId: c.agent_id as number | null,
        groupId: c.group_id as number | null,
        departmentId: c.department_id as number | null,
        category: c.category as string | null,
        plannedStartDate: c.planned_start_date as string | null,
        plannedEndDate: c.planned_end_date as string | null,
        createdAt: c.created_at as string,
        updatedAt: c.updated_at as string,
        isNew: !knownChangeIds.includes(c.id as number)
      }));

      let updatedKnownIds = [
        ...new Set([
          ...knownChangeIds,
          ...changes.map((c: Record<string, unknown>) => c.id as number)
        ])
      ].slice(-1000);

      return {
        inputs,
        updatedState: {
          knownChangeIds: updatedKnownIds
        }
      };
    },
    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'change.created' : 'change.updated';

      return {
        type: eventType,
        id: `${ctx.input.changeId}-${ctx.input.updatedAt}`,
        output: {
          changeId: ctx.input.changeId,
          subject: ctx.input.subject,
          status: ctx.input.status,
          priority: ctx.input.priority,
          changeType: ctx.input.changeType,
          risk: ctx.input.risk,
          impact: ctx.input.impact,
          requesterId: ctx.input.requesterId,
          agentId: ctx.input.agentId,
          groupId: ctx.input.groupId,
          departmentId: ctx.input.departmentId,
          category: ctx.input.category,
          plannedStartDate: ctx.input.plannedStartDate,
          plannedEndDate: ctx.input.plannedEndDate,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
