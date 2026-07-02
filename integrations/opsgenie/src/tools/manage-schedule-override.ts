import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { opsgenieServiceError } from '../lib/errors';
import { spec } from '../spec';

let rotationIdentifierSchema = z.object({
  id: z.string().optional().describe('Rotation ID'),
  name: z.string().optional().describe('Rotation name')
});

let overrideUserSchema = z
  .object({
    type: z.string().optional().describe('Override user type'),
    id: z.string().optional().describe('User ID'),
    username: z.string().optional().describe('Username/email')
  })
  .optional();

let overrideOutputSchema = z.object({
  alias: z.string().describe('Schedule override alias'),
  user: overrideUserSchema.describe('User taking on-call responsibility, or type none'),
  startDate: z.string().optional().describe('Override start time'),
  endDate: z.string().optional().describe('Override end time'),
  rotations: z
    .array(
      z.object({
        id: z.string().optional().describe('Rotation ID'),
        name: z.string().optional().describe('Rotation name')
      })
    )
    .optional()
    .describe('Rotations affected by the override')
});

let requireAlias = (value: string | undefined, action: string) => {
  if (value) return value;
  throw opsgenieServiceError(`alias is required for the ${action} action.`);
};

let requireScheduleOverridePayload = (input: {
  userType?: 'user' | 'none';
  userId?: string;
  userUsername?: string;
  startDate?: string;
  endDate?: string;
  rotations?: Array<{ id?: string; name?: string }>;
}) => {
  if (!input.startDate || !input.endDate) {
    throw opsgenieServiceError('startDate and endDate are required for schedule overrides.');
  }

  for (let rotation of input.rotations ?? []) {
    if (!rotation.id && !rotation.name) {
      throw opsgenieServiceError('Each rotation must include id or name.');
    }
  }

  if (input.userType === 'none') {
    return {
      user: { type: 'none' },
      startDate: input.startDate,
      endDate: input.endDate,
      rotations: input.rotations
    };
  }

  if (input.userId) {
    return {
      user: { type: 'user', id: input.userId },
      startDate: input.startDate,
      endDate: input.endDate,
      rotations: input.rotations
    };
  }

  if (input.userUsername) {
    return {
      user: { type: 'user', username: input.userUsername },
      startDate: input.startDate,
      endDate: input.endDate,
      rotations: input.rotations
    };
  }

  throw opsgenieServiceError(
    'userType "none", userId, or userUsername is required for schedule overrides.'
  );
};

let formatOverride = (override: any) => ({
  alias: override.alias,
  user: override.user
    ? {
        type: override.user.type,
        id: override.user.id,
        username: override.user.username
      }
    : undefined,
  startDate: override.startDate,
  endDate: override.endDate,
  rotations: (override.rotations ?? []).map((rotation: any) => ({
    id: rotation.id,
    name: rotation.name
  }))
});

export let manageScheduleOverride = SlateTool.create(spec, {
  name: 'Manage Schedule Override',
  key: 'manage_schedule_override',
  description:
    'Create, get, update, delete, or list temporary on-call overrides for an Opsgenie schedule.',
  instructions: [
    'For create/update, provide scheduleIdentifier, startDate, endDate, and either userType "none", userId, or userUsername.',
    'For get/update/delete, provide alias.',
    'Use rotations to restrict the override to specific rotations; each rotation must include id or name.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Schedule override action to perform'),
      scheduleIdentifier: z.string().describe('Schedule ID or name'),
      scheduleIdentifierType: z
        .enum(['id', 'name'])
        .optional()
        .describe('Type of schedule identifier. Defaults to "id"'),
      alias: z
        .string()
        .optional()
        .describe('Schedule override alias. Required for get, update, and delete.'),
      userType: z
        .enum(['user', 'none'])
        .optional()
        .describe('Use "user" for a specific user or "none" to reserve the period'),
      userId: z.string().optional().describe('User ID for user overrides'),
      userUsername: z.string().optional().describe('Username/email for user overrides'),
      startDate: z
        .string()
        .optional()
        .describe('Override start time in ISO 8601 format. Required for create/update.'),
      endDate: z
        .string()
        .optional()
        .describe('Override end time in ISO 8601 format. Required for create/update.'),
      rotations: z
        .array(rotationIdentifierSchema)
        .optional()
        .describe('Optional schedule rotations to override')
    })
  )
  .output(
    z.object({
      alias: z.string().optional().describe('Schedule override alias'),
      requestId: z.string().optional().describe('Opsgenie request ID'),
      override: overrideOutputSchema.optional().describe('Schedule override details'),
      overrides: z
        .array(overrideOutputSchema)
        .optional()
        .describe('Schedule overrides returned by list'),
      totalCount: z.number().optional().describe('Number of overrides returned by list'),
      result: z.string().describe('Operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });
    let params = { scheduleIdentifierType: ctx.input.scheduleIdentifierType ?? 'id' };

    switch (ctx.input.action) {
      case 'create': {
        let response = await client.createScheduleOverride(
          ctx.input.scheduleIdentifier,
          params,
          {
            alias: ctx.input.alias,
            ...requireScheduleOverridePayload(ctx.input)
          }
        );
        let alias = response.data?.alias ?? ctx.input.alias;
        return {
          output: {
            alias,
            requestId: response.requestId,
            result: response.result ?? 'Schedule override request will be processed'
          },
          message: `Created schedule override${alias ? ` \`${alias}\`` : ''}.`
        };
      }
      case 'get': {
        let alias = requireAlias(ctx.input.alias, 'get');
        let override = await client.getScheduleOverride(
          ctx.input.scheduleIdentifier,
          alias,
          params
        );
        return {
          output: {
            alias: override.alias,
            override: formatOverride(override),
            result: 'Schedule override retrieved successfully'
          },
          message: `Retrieved schedule override \`${override.alias}\`.`
        };
      }
      case 'update': {
        let alias = requireAlias(ctx.input.alias, 'update');
        let response = await client.updateScheduleOverride(
          ctx.input.scheduleIdentifier,
          alias,
          params,
          requireScheduleOverridePayload(ctx.input)
        );
        return {
          output: {
            alias: response.data?.alias ?? alias,
            requestId: response.requestId,
            result: response.result ?? 'Schedule override updated successfully'
          },
          message: `Updated schedule override \`${alias}\`.`
        };
      }
      case 'delete': {
        let alias = requireAlias(ctx.input.alias, 'delete');
        let response = await client.deleteScheduleOverride(
          ctx.input.scheduleIdentifier,
          alias,
          params
        );
        return {
          output: {
            alias,
            requestId: response.requestId,
            result: response.result ?? 'Schedule override deleted successfully'
          },
          message: `Deleted schedule override \`${alias}\`.`
        };
      }
      case 'list': {
        let data = await client.listScheduleOverrides(ctx.input.scheduleIdentifier, params);
        let overrides = (data ?? []).map(formatOverride);
        return {
          output: {
            overrides,
            totalCount: overrides.length,
            result: 'Schedule overrides listed successfully'
          },
          message: `Found **${overrides.length}** schedule overrides.`
        };
      }
    }
  })
  .build();
