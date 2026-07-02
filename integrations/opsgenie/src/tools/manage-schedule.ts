import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { opsgenieServiceError } from '../lib/errors';
import { spec } from '../spec';

let rotationSchema = z.object({
  name: z.string().optional().describe('Rotation name'),
  startDate: z.string().describe('Start date in ISO 8601 format'),
  endDate: z.string().optional().describe('End date in ISO 8601 format'),
  type: z.enum(['daily', 'weekly', 'hourly']).describe('Rotation type'),
  length: z.number().optional().describe('Length of rotation period'),
  participants: z
    .array(
      z.object({
        type: z.enum(['user', 'team', 'escalation', 'none']).describe('Participant type'),
        id: z.string().optional().describe('Participant ID'),
        username: z.string().optional().describe('Username (for user type)')
      })
    )
    .describe('Rotation participants')
});

export let manageSchedule = SlateTool.create(spec, {
  name: 'Manage Schedule',
  key: 'manage_schedule',
  description: `Create, update, or delete an on-call schedule. When creating, provide a name and optionally rotations and timezone. When updating, provide the schedule identifier and fields to change. When deleting, provide the identifier with the delete action.`,
  instructions: [
    'To create: omit scheduleIdentifier and provide at least a name.',
    'To update: provide scheduleIdentifier and the fields to change.',
    'To delete: provide scheduleIdentifier and set action to "delete".'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      scheduleIdentifier: z
        .string()
        .optional()
        .describe('Schedule ID or name (required for update/delete)'),
      identifierType: z
        .enum(['id', 'name'])
        .optional()
        .describe('Type of identifier provided. Defaults to "id"'),
      name: z.string().optional().describe('Schedule name (required for create)'),
      description: z.string().optional().describe('Schedule description'),
      timezone: z.string().optional().describe('Timezone (e.g., "America/New_York")'),
      enabled: z.boolean().optional().describe('Whether the schedule is enabled'),
      ownerTeamId: z.string().optional().describe('ID of the owning team'),
      ownerTeamName: z.string().optional().describe('Name of the owning team'),
      rotations: z.array(rotationSchema).optional().describe('Schedule rotations')
    })
  )
  .output(
    z.object({
      scheduleId: z.string().optional().describe('Schedule ID'),
      name: z.string().optional().describe('Schedule name'),
      result: z.string().describe('Operation result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let ownerTeam = ctx.input.ownerTeamId
      ? { id: ctx.input.ownerTeamId }
      : ctx.input.ownerTeamName
        ? { name: ctx.input.ownerTeamName }
        : undefined;

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name) {
          throw opsgenieServiceError('name is required when creating a schedule.');
        }
        let schedule = await client.createSchedule({
          name: ctx.input.name,
          description: ctx.input.description,
          timezone: ctx.input.timezone,
          enabled: ctx.input.enabled,
          ownerTeam,
          rotations: ctx.input.rotations as any
        });
        return {
          output: {
            scheduleId: schedule.id,
            name: schedule.name,
            result: `Schedule "${schedule.name}" created successfully`
          },
          message: `Created schedule **${schedule.name}**`
        };
      }
      case 'update': {
        if (!ctx.input.scheduleIdentifier) {
          throw opsgenieServiceError(
            'scheduleIdentifier is required when updating a schedule.'
          );
        }
        let updated = await client.updateSchedule(
          ctx.input.scheduleIdentifier,
          ctx.input.identifierType ?? 'id',
          {
            name: ctx.input.name,
            description: ctx.input.description,
            timezone: ctx.input.timezone,
            enabled: ctx.input.enabled,
            ownerTeam,
            rotations: ctx.input.rotations as any
          }
        );
        return {
          output: {
            scheduleId: updated.id,
            name: updated.name,
            result: `Schedule updated successfully`
          },
          message: `Updated schedule **${updated.name}**`
        };
      }
      case 'delete': {
        if (!ctx.input.scheduleIdentifier) {
          throw opsgenieServiceError(
            'scheduleIdentifier is required when deleting a schedule.'
          );
        }
        await client.deleteSchedule(
          ctx.input.scheduleIdentifier,
          ctx.input.identifierType ?? 'id'
        );
        return {
          output: {
            result: `Schedule deleted successfully`
          },
          message: `Deleted schedule \`${ctx.input.scheduleIdentifier}\``
        };
      }
    }
  })
  .build();
