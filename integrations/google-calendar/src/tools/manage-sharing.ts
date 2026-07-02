import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleCalendarClient } from '../lib/client';
import { googleCalendarActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageSharing = SlateTool.create(spec, {
  name: 'Manage Sharing',
  key: 'manage_sharing',
  description: `Manage access control (sharing permissions) on a calendar. List current permissions, grant access to users/groups, update roles, or revoke access.`,
  instructions: [
    'Use action "list" to see all current sharing rules.',
    'Use action "grant" to share a calendar with a user, group, or domain.',
    'Use action "update" to change the role of an existing sharing rule.',
    'Use action "revoke" to remove a sharing rule.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleCalendarActionScopes.manageSharing)
  .input(
    z.object({
      action: z.enum(['list', 'grant', 'update', 'revoke']).describe('Operation to perform'),
      calendarId: z.string().describe('Calendar ID to manage sharing for'),
      ruleId: z.string().optional().describe('ACL rule ID (required for update and revoke)'),
      scopeType: z
        .enum(['user', 'group', 'domain', 'default'])
        .optional()
        .describe('Type of scope to grant access to (required for grant)'),
      scopeValue: z
        .string()
        .optional()
        .describe(
          'Email address, group email, or domain (required for grant unless scopeType is "default")'
        ),
      role: z
        .enum(['none', 'freeBusyReader', 'reader', 'writer', 'owner'])
        .optional()
        .describe('Access role to grant or update to (required for grant and update)')
    })
  )
  .output(
    z.object({
      rules: z
        .array(
          z.object({
            ruleId: z.string().optional().describe('ACL rule ID'),
            scopeType: z.string().optional().describe('Scope type'),
            scopeValue: z.string().optional().describe('Scope value'),
            role: z.string().optional().describe('Access role')
          })
        )
        .optional()
        .describe('List of ACL rules (for list action)'),
      rule: z
        .object({
          ruleId: z.string().optional().describe('ACL rule ID'),
          scopeType: z.string().optional().describe('Scope type'),
          scopeValue: z.string().optional().describe('Scope value'),
          role: z.string().optional().describe('Access role')
        })
        .optional()
        .describe('Created/updated ACL rule'),
      deleted: z.boolean().optional().describe('Whether the rule was deleted'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleCalendarClient(ctx.auth.token);
    let { action, calendarId } = ctx.input;

    if (action === 'list') {
      let result = await client.listAcl(calendarId);
      let rules = (result.items || []).map(r => ({
        ruleId: r.id,
        scopeType: r.scope?.type,
        scopeValue: r.scope?.value,
        role: r.role
      }));
      return {
        output: { rules, action: 'list' },
        message: `Found **${rules.length}** sharing rule(s) on calendar \`${calendarId}\`.`
      };
    }

    if (action === 'grant') {
      if (!ctx.input.scopeType) throw new Error('scopeType is required for granting access');
      if (!ctx.input.role) throw new Error('role is required for granting access');

      let rule = await client.insertAcl(calendarId, {
        scope: { type: ctx.input.scopeType, value: ctx.input.scopeValue },
        role: ctx.input.role
      });
      return {
        output: {
          rule: {
            ruleId: rule.id,
            scopeType: rule.scope?.type,
            scopeValue: rule.scope?.value,
            role: rule.role
          },
          action: 'grant'
        },
        message: `Granted **${ctx.input.role}** access to \`${ctx.input.scopeValue || ctx.input.scopeType}\` on calendar \`${calendarId}\`.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.ruleId) throw new Error('ruleId is required for updating a rule');
      if (!ctx.input.role) throw new Error('role is required for updating a rule');

      let rule = await client.updateAcl(calendarId, ctx.input.ruleId, {
        role: ctx.input.role
      });
      return {
        output: {
          rule: {
            ruleId: rule.id,
            scopeType: rule.scope?.type,
            scopeValue: rule.scope?.value,
            role: rule.role
          },
          action: 'update'
        },
        message: `Updated sharing rule \`${ctx.input.ruleId}\` to role **${ctx.input.role}**.`
      };
    }

    if (action === 'revoke') {
      if (!ctx.input.ruleId) throw new Error('ruleId is required for revoking access');
      await client.deleteAcl(calendarId, ctx.input.ruleId);
      return {
        output: {
          deleted: true,
          action: 'revoke'
        },
        message: `Revoked sharing rule \`${ctx.input.ruleId}\` from calendar \`${calendarId}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
