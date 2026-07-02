import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

let escalationRuleSchema = z.object({
  condition: z
    .enum(['if-not-acked', 'if-not-closed'])
    .describe('Condition to trigger this rule'),
  notifyType: z
    .enum(['default', 'next', 'previous', 'users', 'admins', 'all'])
    .describe('Notification type'),
  delay: z
    .object({
      timeAmount: z.number().describe('Delay amount'),
      timeUnit: z.enum(['minutes', 'hours', 'days']).describe('Delay unit')
    })
    .describe('Delay before notifying'),
  recipient: z
    .object({
      type: z.enum(['team', 'user', 'schedule', 'escalation']).describe('Recipient type'),
      id: z.string().optional().describe('Recipient ID'),
      username: z.string().optional().describe('Username (for user type)'),
      name: z.string().optional().describe('Name (for team, schedule types)')
    })
    .describe('Who to notify')
});

let repeatSchema = z
  .object({
    waitInterval: z.number().optional().describe('Wait interval in minutes between repeats'),
    count: z.number().optional().describe('Number of times to repeat'),
    resetRecipientStates: z
      .boolean()
      .optional()
      .describe('Whether to reset recipient notification states'),
    closeAlertAfterAll: z
      .boolean()
      .optional()
      .describe('Whether to close the alert after all repeats')
  })
  .optional();

export let manageEscalation = SlateTool.create(spec, {
  name: 'Manage Escalation',
  key: 'manage_escalation',
  description: `Create, update, or delete an escalation policy. Escalation policies define the order and timing of notifications when alerts are not acknowledged. Rules specify conditions, delays, and recipients.`,
  instructions: [
    'To create: set action to "create" and provide name and rules.',
    'To update: set action to "update" and provide escalationIdentifier plus the fields to change.',
    'To delete: set action to "delete" and provide escalationIdentifier.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      escalationIdentifier: z
        .string()
        .optional()
        .describe('Escalation ID or name (required for update/delete)'),
      identifierType: z
        .enum(['id', 'name'])
        .optional()
        .describe('Type of identifier. Defaults to "id"'),
      name: z.string().optional().describe('Escalation policy name (required for create)'),
      description: z.string().optional().describe('Escalation policy description'),
      rules: z
        .array(escalationRuleSchema)
        .optional()
        .describe('Escalation rules defining notification order and timing'),
      ownerTeamId: z.string().optional().describe('ID of the owning team'),
      ownerTeamName: z.string().optional().describe('Name of the owning team'),
      repeat: repeatSchema.describe('Repeat configuration for cycling through rules')
    })
  )
  .output(
    z.object({
      escalationId: z.string().optional().describe('Escalation policy ID'),
      name: z.string().optional().describe('Escalation policy name'),
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
          throw new Error('name is required when creating an escalation policy.');
        }
        if (!ctx.input.rules || ctx.input.rules.length === 0) {
          throw new Error('rules are required when creating an escalation policy.');
        }
        let escalation = await client.createEscalation({
          name: ctx.input.name,
          description: ctx.input.description,
          rules: ctx.input.rules,
          ownerTeam,
          repeat: ctx.input.repeat ?? undefined
        });
        return {
          output: {
            escalationId: escalation.id,
            name: escalation.name ?? ctx.input.name,
            result: 'Escalation policy created successfully'
          },
          message: `Created escalation policy **${ctx.input.name}**`
        };
      }
      case 'update': {
        if (!ctx.input.escalationIdentifier) {
          throw new Error(
            'escalationIdentifier is required when updating an escalation policy.'
          );
        }
        let updated = await client.updateEscalation(
          ctx.input.escalationIdentifier,
          ctx.input.identifierType ?? 'id',
          {
            name: ctx.input.name,
            description: ctx.input.description,
            rules: ctx.input.rules,
            ownerTeam,
            repeat: ctx.input.repeat ?? undefined
          }
        );
        return {
          output: {
            escalationId: updated.id,
            name: updated.name,
            result: 'Escalation policy updated successfully'
          },
          message: `Updated escalation policy **${updated.name ?? ctx.input.escalationIdentifier}**`
        };
      }
      case 'delete': {
        if (!ctx.input.escalationIdentifier) {
          throw new Error(
            'escalationIdentifier is required when deleting an escalation policy.'
          );
        }
        await client.deleteEscalation(
          ctx.input.escalationIdentifier,
          ctx.input.identifierType ?? 'id'
        );
        return {
          output: {
            result: 'Escalation policy deleted successfully'
          },
          message: `Deleted escalation policy \`${ctx.input.escalationIdentifier}\``
        };
      }
    }
  })
  .build();
