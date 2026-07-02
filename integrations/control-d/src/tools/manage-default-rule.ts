import { SlateTool } from 'slates';
import { z } from 'zod';
import { actionDescription, createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDefaultRule = SlateTool.create(spec, {
  name: 'Manage Default Rule',
  key: 'manage_default_rule',
  description: `Get or update the default DNS rule for a profile. The default rule is the catch-all that applies to all domains not matched by custom rules, services, or filters. It can block, bypass, spoof, or redirect all unmatched traffic.`,
  instructions: [
    'The default rule is the lowest priority; custom rules, service rules, and filters take precedence.',
    'Use action=3 (Redirect) with a proxy code to route all unmatched traffic through a proxy.'
  ]
})
  .input(
    z.object({
      operation: z.enum(['get', 'update']).describe('Operation to perform'),
      profileId: z.string().describe('Profile ID'),
      action: z
        .number()
        .optional()
        .describe('Action: 0=Block, 1=Bypass, 2=Spoof, 3=Redirect (required for update)'),
      enabled: z
        .boolean()
        .optional()
        .describe('Enable or disable the default rule (required for update)'),
      via: z
        .string()
        .optional()
        .describe('Target for Spoof/Redirect (e.g., proxy code "JFK" or IP address)')
    })
  )
  .output(
    z.object({
      action: z.number().describe('Action code (0=Block, 1=Bypass, 2=Spoof, 3=Redirect)'),
      actionLabel: z.string().describe('Human-readable action description'),
      enabled: z.boolean().describe('Whether the default rule is enabled'),
      via: z.string().describe('Target for Spoof/Redirect')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { operation, profileId, action, enabled, via } = ctx.input;

    if (operation === 'update') {
      if (action === undefined) throw new Error('action is required for update');
      if (enabled === undefined) throw new Error('enabled is required for update');

      let rule = await client.modifyDefaultRule(profileId, {
        action,
        status: enabled ? 1 : 0,
        via
      });

      return {
        output: {
          action: rule.do,
          actionLabel: actionDescription(rule.do, rule.via),
          enabled: rule.status === 1,
          via: rule.via || ''
        },
        message: `Updated default rule to **${actionDescription(rule.do, rule.via)}** (${rule.status === 1 ? 'enabled' : 'disabled'}).`
      };
    }

    // get
    let rule = await client.getDefaultRule(profileId);
    return {
      output: {
        action: rule.do,
        actionLabel: actionDescription(rule.do, rule.via),
        enabled: rule.status === 1,
        via: rule.via || ''
      },
      message: `Default rule: **${actionDescription(rule.do, rule.via)}** (${rule.status === 1 ? 'enabled' : 'disabled'}).`
    };
  })
  .build();
