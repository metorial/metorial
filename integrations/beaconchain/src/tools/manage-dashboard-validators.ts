import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let manageDashboardValidators = SlateTool.create(spec, {
  name: 'Manage Dashboard Validators',
  key: 'manage_dashboard_validators',
  description: `Add or remove validators from a Beaconcha.in validator dashboard. Supports adding validators to a specific group, bulk removing validators, or clearing all validators from a group.
Dashboards and groups must be created through the Beaconcha.in web UI first.`,
  instructions: [
    'Use action "add" to add validators to a dashboard, optionally assigning them to a group.',
    'Use action "remove" to bulk remove specific validators from a dashboard.',
    'Use action "clear_group" to remove all validators from a specific group within a dashboard.'
  ],
  constraints: [
    'Requires an active Orca subscription.',
    'Dashboards and groups must be created via the web UI before using this tool.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      dashboardId: z.number().describe('ID of the validator dashboard'),
      action: z.enum(['add', 'remove', 'clear_group']).describe('Action to perform'),
      validators: z
        .array(z.union([z.string(), z.number()]))
        .optional()
        .describe(
          'Validator indices or public keys to add/remove. Required for "add" and "remove" actions.'
        ),
      groupId: z
        .number()
        .optional()
        .describe(
          'Group ID to assign validators to (for "add") or clear all validators from (for "clear_group")'
        )
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result of the dashboard operation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({
      token: ctx.auth.token,
      chain: ctx.config.chain
    });

    let result: any;

    switch (ctx.input.action) {
      case 'add': {
        if (!ctx.input.validators || ctx.input.validators.length === 0) {
          throw new Error('validators is required for the "add" action');
        }
        result = await client.addValidatorsToDashboard(
          ctx.input.dashboardId,
          ctx.input.validators,
          ctx.input.groupId
        );
        break;
      }
      case 'remove': {
        if (!ctx.input.validators || ctx.input.validators.length === 0) {
          throw new Error('validators is required for the "remove" action');
        }
        result = await client.removeValidatorsFromDashboard(
          ctx.input.dashboardId,
          ctx.input.validators
        );
        break;
      }
      case 'clear_group': {
        if (ctx.input.groupId === undefined) {
          throw new Error('groupId is required for the "clear_group" action');
        }
        result = await client.removeValidatorsFromGroup(
          ctx.input.dashboardId,
          ctx.input.groupId
        );
        break;
      }
    }

    let actionDesc =
      ctx.input.action === 'add'
        ? 'Added'
        : ctx.input.action === 'remove'
          ? 'Removed'
          : 'Cleared group';

    return {
      output: { result },
      message: `${actionDesc} validators on dashboard **${ctx.input.dashboardId}**.`
    };
  })
  .build();
