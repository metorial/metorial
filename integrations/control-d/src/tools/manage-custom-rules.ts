import { SlateTool } from 'slates';
import { z } from 'zod';
import { actionDescription, createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageCustomRules = SlateTool.create(spec, {
  name: 'Manage Custom Rules',
  key: 'manage_custom_rules',
  description: `Create, list, update, or delete custom domain-level DNS rules on a profile. Custom rules provide granular control over individual domains, TLDs, and wildcard patterns. Each rule can block, bypass (allow), spoof (to a custom IP), or redirect traffic through a proxy location. Rules are organized into folders.`,
  instructions: [
    'Use "list" to view custom rules. Optionally filter by folderId (use "0" for the root folder).',
    'Use "create" to add new rules with one or more hostnames.',
    'Use "update" to modify existing rules for given hostnames.',
    'Use "delete" to remove a rule by its hostname.',
    'Action values: 0=Block, 1=Bypass, 2=Spoof, 3=Redirect. Provide "via" for Spoof (IP address) or Redirect (proxy code).'
  ]
})
  .input(
    z.object({
      operation: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      profileId: z.string().describe('Profile ID'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID to scope rules (default: root folder "0")'),
      hostnames: z
        .array(z.string())
        .optional()
        .describe('Domain names for the rule (required for create/update)'),
      hostname: z
        .string()
        .optional()
        .describe('Single hostname to delete (required for delete)'),
      action: z.number().optional().describe('Action: 0=Block, 1=Bypass, 2=Spoof, 3=Redirect'),
      enabled: z.boolean().optional().describe('Enable or disable the rule'),
      via: z
        .string()
        .optional()
        .describe('Target: IP/hostname for Spoof, proxy code for Redirect (e.g., "JFK")'),
      viaV6: z.string().optional().describe('IPv6 address for Spoof action'),
      group: z.number().optional().describe('Folder ID to assign rules to')
    })
  )
  .output(
    z.object({
      rules: z.array(
        z.object({
          hostname: z.string().describe('Domain name'),
          folderId: z.number().describe('Folder the rule belongs to'),
          action: z.string().describe('Applied action description'),
          enabled: z.boolean().describe('Whether the rule is enabled'),
          order: z.number().describe('Rule order')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      operation,
      profileId,
      folderId,
      hostnames,
      hostname,
      action,
      enabled,
      via,
      viaV6,
      group
    } = ctx.input;

    if (operation === 'create') {
      if (!hostnames || hostnames.length === 0)
        throw new Error('hostnames is required for create');
      if (action === undefined) throw new Error('action is required for create');
      await client.createCustomRule(profileId, {
        hostnames,
        action,
        status: enabled !== false ? 1 : 0,
        via,
        viaV6,
        group
      });
      let rules = await client.listCustomRules(
        profileId,
        folderId || (group !== undefined ? String(group) : undefined)
      );
      return {
        output: {
          rules: rules.map(r => ({
            hostname: r.PK,
            folderId: r.group,
            action: actionDescription(r.action.do, r.action.via),
            enabled: r.action.status === 1,
            order: r.order
          }))
        },
        message: `Created rule(s) for **${hostnames.join(', ')}** with action **${actionDescription(action, via)}**.`
      };
    }

    if (operation === 'update') {
      if (!hostnames || hostnames.length === 0)
        throw new Error('hostnames is required for update');
      if (action === undefined) throw new Error('action is required for update');
      await client.modifyCustomRule(profileId, {
        hostnames,
        action,
        status: enabled !== false ? 1 : 0,
        via,
        viaV6,
        group
      });
      let rules = await client.listCustomRules(
        profileId,
        folderId || (group !== undefined ? String(group) : undefined)
      );
      return {
        output: {
          rules: rules.map(r => ({
            hostname: r.PK,
            folderId: r.group,
            action: actionDescription(r.action.do, r.action.via),
            enabled: r.action.status === 1,
            order: r.order
          }))
        },
        message: `Updated rule(s) for **${hostnames.join(', ')}**.`
      };
    }

    if (operation === 'delete') {
      if (!hostname) throw new Error('hostname is required for delete');
      await client.deleteCustomRule(profileId, hostname);
      return {
        output: { rules: [] },
        message: `Deleted rule for **${hostname}**.`
      };
    }

    // list
    let rules = await client.listCustomRules(profileId, folderId);
    return {
      output: {
        rules: rules.map(r => ({
          hostname: r.PK,
          folderId: r.group,
          action: actionDescription(r.action.do, r.action.via),
          enabled: r.action.status === 1,
          order: r.order
        }))
      },
      message: `Found **${rules.length}** custom rule(s) on profile ${profileId}${folderId ? ` in folder ${folderId}` : ''}.`
    };
  })
  .build();
