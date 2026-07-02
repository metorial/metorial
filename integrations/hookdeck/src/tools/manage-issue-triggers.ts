import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  hookdeckServiceError,
  requireHookdeckInput,
  requireHookdeckRecord
} from '../lib/errors';
import { spec } from '../spec';

let issueTriggerSchema = z.object({
  issueTriggerId: z.string().describe('Issue trigger ID'),
  teamId: z.string().nullable().optional().describe('Team/project ID'),
  name: z.string().nullable().optional().describe('Optional unique trigger name'),
  type: z
    .enum(['delivery', 'transformation', 'backpressure', 'request'])
    .describe('Issue trigger type'),
  configs: z
    .record(z.string(), z.unknown())
    .describe('Trigger configuration for the selected type'),
  channels: z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .describe('Notification channels configured for the trigger'),
  disabledAt: z.string().nullable().optional().describe('Timestamp if disabled'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

let issueTriggerTypeSchema = z.enum(['delivery', 'transformation', 'backpressure', 'request']);

export let manageIssueTriggers = SlateTool.create(spec, {
  name: 'Manage Issue Triggers',
  key: 'manage_issue_triggers',
  description: `List, inspect, create, update, enable, disable, and delete Hookdeck issue triggers. Issue triggers define which delivery, transformation, backpressure, or request problems open issues and send notifications.`,
  instructions: [
    'Delivery configs use strategy ("first_attempt" or "final_attempt") and connections ("*" or connection IDs).',
    'Transformation configs use log_level and transformations. Backpressure configs use delay and destinations.',
    'Request configs use rejection_causes and sources. Channels can include email, Slack, Discord, Microsoft Teams, PagerDuty, Opsgenie, or Better Uptime.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'enable', 'disable'])
        .describe('Action to perform'),
      issueTriggerId: z
        .string()
        .optional()
        .describe('Issue trigger ID (required for get, update, delete, enable, disable)'),
      name: z.string().nullable().optional().describe('Optional unique trigger name'),
      type: issueTriggerTypeSchema.optional().describe('Issue trigger type'),
      configs: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Configuration object for the selected trigger type'),
      channels: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('Notification channels object, such as { email: {} }'),
      limit: z.number().optional().describe('Max results (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      issueTrigger: issueTriggerSchema.optional().describe('Single issue trigger'),
      issueTriggers: z.array(issueTriggerSchema).optional().describe('List of triggers'),
      deletedId: z.string().optional().describe('Deleted issue trigger ID'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapIssueTrigger = (trigger: any) => ({
      issueTriggerId: trigger.id as string,
      teamId: (trigger.team_id as string | null | undefined) ?? null,
      name: (trigger.name as string | null | undefined) ?? null,
      type: trigger.type as 'delivery' | 'transformation' | 'backpressure' | 'request',
      configs: (trigger.configs ?? {}) as Record<string, unknown>,
      channels: (trigger.channels as Record<string, unknown> | null | undefined) ?? null,
      disabledAt: (trigger.disabled_at as string | null | undefined) ?? null,
      createdAt: trigger.created_at as string,
      updatedAt: trigger.updated_at as string
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listIssueTriggers({
          limit: ctx.input.limit,
          next: ctx.input.cursor
        });
        return {
          output: {
            issueTriggers: result.models.map(mapIssueTrigger),
            totalCount: result.count,
            nextCursor: result.pagination.next
          },
          message: `Listed **${result.models.length}** issue triggers (${result.count} total).`
        };
      }
      case 'get': {
        let issueTriggerId = requireHookdeckInput(
          ctx.input.issueTriggerId,
          'issueTriggerId',
          'get'
        );
        let trigger = await client.getIssueTrigger(issueTriggerId);
        return {
          output: { issueTrigger: mapIssueTrigger(trigger) },
          message: `Retrieved issue trigger \`${trigger.id}\` (${trigger.type}).`
        };
      }
      case 'create': {
        let type = requireHookdeckInput(ctx.input.type, 'type', 'create');
        let configs = requireHookdeckRecord(ctx.input.configs, 'configs', 'create');
        let trigger = await client.createIssueTrigger({
          name: ctx.input.name,
          type,
          configs,
          channels: ctx.input.channels
        });
        return {
          output: { issueTrigger: mapIssueTrigger(trigger) },
          message: `Created ${trigger.type} issue trigger \`${trigger.id}\`.`
        };
      }
      case 'update': {
        let issueTriggerId = requireHookdeckInput(
          ctx.input.issueTriggerId,
          'issueTriggerId',
          'update'
        );

        if (
          ctx.input.name === undefined &&
          ctx.input.type === undefined &&
          ctx.input.configs === undefined &&
          ctx.input.channels === undefined
        ) {
          throw hookdeckServiceError(
            'name, type, configs, or channels is required for "update".'
          );
        }

        let trigger = await client.updateIssueTrigger(issueTriggerId, {
          name: ctx.input.name,
          type: ctx.input.type,
          configs: ctx.input.configs,
          channels: ctx.input.channels
        });
        return {
          output: { issueTrigger: mapIssueTrigger(trigger) },
          message: `Updated issue trigger \`${trigger.id}\` (${trigger.type}).`
        };
      }
      case 'delete': {
        let issueTriggerId = requireHookdeckInput(
          ctx.input.issueTriggerId,
          'issueTriggerId',
          'delete'
        );
        let result = await client.deleteIssueTrigger(issueTriggerId);
        return {
          output: { deletedId: result.id },
          message: `Deleted issue trigger \`${result.id}\`.`
        };
      }
      case 'enable': {
        let issueTriggerId = requireHookdeckInput(
          ctx.input.issueTriggerId,
          'issueTriggerId',
          'enable'
        );
        let trigger = await client.enableIssueTrigger(issueTriggerId);
        return {
          output: { issueTrigger: mapIssueTrigger(trigger) },
          message: `Enabled issue trigger \`${trigger.id}\`.`
        };
      }
      case 'disable': {
        let issueTriggerId = requireHookdeckInput(
          ctx.input.issueTriggerId,
          'issueTriggerId',
          'disable'
        );
        let trigger = await client.disableIssueTrigger(issueTriggerId);
        return {
          output: { issueTrigger: mapIssueTrigger(trigger) },
          message: `Disabled issue trigger \`${trigger.id}\`.`
        };
      }
    }
  })
  .build();
