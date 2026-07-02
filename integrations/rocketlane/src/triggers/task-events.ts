import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggers when a task is created or updated in Rocketlane. Includes the full task object, actor information, and a changelog for updates showing which fields changed.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of task event'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      taskId: z.number().describe('ID of the affected task'),
      taskName: z.string().describe('Name of the task'),
      projectId: z.number().optional().describe('ID of the project the task belongs to'),
      projectName: z.string().optional().describe('Name of the project'),
      status: z.any().optional().describe('Task status'),
      assignees: z.array(z.any()).optional().describe('Task assignees'),
      startDate: z.string().nullable().optional().describe('Task start date'),
      dueDate: z.string().nullable().optional().describe('Task due date'),
      progress: z.number().optional().describe('Task progress percentage'),
      actor: z
        .object({
          userId: z.number().optional().describe('User ID of who triggered the event'),
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().optional().describe('Last name'),
          emailId: z.string().optional().describe('Email')
        })
        .optional()
        .describe('User who triggered the event'),
      changelog: z
        .array(
          z.object({
            field: z.string().optional().describe('Name of the changed field'),
            previousValue: z.any().optional().describe('Value before the change'),
            newValue: z.any().optional().describe('Value after the change')
          })
        )
        .optional()
        .describe('Fields that changed (for update events)'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      taskId: z.number().describe('ID of the affected task'),
      taskName: z.string().describe('Name of the task'),
      projectId: z.number().optional().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      status: z.any().optional().describe('Task status'),
      assignees: z.array(z.any()).optional().describe('Task assignees'),
      startDate: z.string().nullable().optional().describe('Task start date'),
      dueDate: z.string().nullable().optional().describe('Task due date'),
      progress: z.number().optional().describe('Task progress percentage'),
      actorEmail: z.string().optional().describe('Email of the user who triggered the event'),
      actorName: z
        .string()
        .optional()
        .describe('Full name of the user who triggered the event'),
      changelog: z
        .array(
          z.object({
            field: z.string().optional().describe('Changed field name'),
            previousValue: z.any().optional().describe('Previous value'),
            newValue: z.any().optional().describe('New value')
          })
        )
        .optional()
        .describe('Fields that changed (for update events)'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Rocketlane webhook payloads include the task object, actor, and event metadata
      let task = data.task ?? data.data ?? data;
      let actor = data.actor ?? data.user;
      let changelog = data.changelog ?? data.changes ?? [];
      let eventType = data.eventType ?? data.event_type ?? data.type ?? 'updated';
      let timestamp = data.timestamp ?? data.createdAt ?? new Date().toISOString();

      let normalizedEventType: 'created' | 'updated' = 'updated';
      if (typeof eventType === 'string' && eventType.toLowerCase().includes('creat')) {
        normalizedEventType = 'created';
      }

      let eventId = data.eventId ?? data.event_id ?? `${task.taskId ?? task.id}-${timestamp}`;

      return {
        inputs: [
          {
            eventType: normalizedEventType,
            eventId: String(eventId),
            taskId: task.taskId ?? task.id,
            taskName: task.taskName ?? task.name ?? '',
            projectId: task.projectId ?? task.project?.projectId,
            projectName: task.projectName ?? task.project?.projectName,
            status: task.status,
            assignees: task.assignees ?? [],
            startDate: task.startDate ?? null,
            dueDate: task.dueDate ?? null,
            progress: task.progress,
            actor: actor
              ? {
                  userId: actor.userId,
                  firstName: actor.firstName,
                  lastName: actor.lastName,
                  emailId: actor.emailId ?? actor.email
                }
              : undefined,
            changelog: Array.isArray(changelog) ? changelog : [],
            timestamp: String(timestamp)
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let actorName: string | undefined;
      if (ctx.input.actor) {
        let parts = [ctx.input.actor.firstName, ctx.input.actor.lastName].filter(Boolean);
        actorName = parts.length > 0 ? parts.join(' ') : undefined;
      }

      return {
        type: `task.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          taskId: ctx.input.taskId,
          taskName: ctx.input.taskName,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          status: ctx.input.status,
          assignees: ctx.input.assignees,
          startDate: ctx.input.startDate,
          dueDate: ctx.input.dueDate,
          progress: ctx.input.progress,
          actorEmail: ctx.input.actor?.emailId,
          actorName,
          changelog: ctx.input.changelog,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
