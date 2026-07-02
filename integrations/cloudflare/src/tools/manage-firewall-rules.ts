import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageFirewallRulesTool = SlateTool.create(spec, {
  name: 'Manage Firewall Rules',
  key: 'manage_firewall_rules',
  description: `List, create, or delete firewall rules, modern WAF custom rules, and IP access rules for a zone. Rules use Cloudflare's expression language to match requests and apply actions like block, challenge, or allow.`,
  instructions: [
    'Firewall expressions use Cloudflare wirefilter syntax, e.g. `ip.src == 1.2.3.4` or `http.request.uri.path contains "/admin"`.',
    'Available actions: block, challenge, js_challenge, managed_challenge, allow, log, bypass.',
    'Use list_custom_rules, create_custom_rule, and delete_custom_rule for the current Rulesets API WAF custom rules.',
    'For IP access rules, use ipAction with mode and target IP/range.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'create',
          'delete',
          'list_custom_rules',
          'create_custom_rule',
          'delete_custom_rule',
          'list_ip_rules',
          'create_ip_rule',
          'delete_ip_rule'
        ])
        .describe('Operation to perform'),
      zoneId: z.string().describe('Zone ID'),
      ruleId: z.string().optional().describe('Rule ID for delete operations'),
      expression: z.string().optional().describe('Firewall expression for matching requests'),
      firewallAction: z
        .string()
        .optional()
        .describe(
          'Action to take (block, challenge, js_challenge, managed_challenge, allow, log, bypass)'
        ),
      description: z.string().optional().describe('Description of the rule'),
      paused: z.boolean().optional().describe('Whether the rule is paused'),
      enabled: z.boolean().optional().describe('Whether a WAF custom rule is enabled'),
      ipMode: z
        .string()
        .optional()
        .describe('IP access rule mode (block, challenge, whitelist, js_challenge)'),
      ipTarget: z
        .string()
        .optional()
        .describe('IP access rule target type (ip, ip_range, asn, country)'),
      ipValue: z
        .string()
        .optional()
        .describe('IP access rule value (IP address, CIDR range, ASN, or country code)'),
      notes: z.string().optional().describe('Notes for IP access rule')
    })
  )
  .output(
    z.object({
      rules: z
        .array(
          z.object({
            ruleId: z.string(),
            expression: z.string().optional(),
            action: z.string().optional(),
            description: z.string().optional(),
            paused: z.boolean().optional(),
            enabled: z.boolean().optional()
          })
        )
        .optional(),
      createdRule: z
        .object({
          ruleId: z.string(),
          action: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action, zoneId } = ctx.input;

    if (action === 'list') {
      let response = await client.listFirewallRules(zoneId);
      let rules = response.result.map((r: any) => ({
        ruleId: r.id,
        expression: r.filter?.expression,
        action: r.action,
        description: r.description,
        paused: r.paused
      }));
      return {
        output: { rules },
        message: `Found **${rules.length}** firewall rule(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.expression || !ctx.input.firewallAction) {
        throw cloudflareServiceError('expression and firewallAction are required');
      }
      let response = await client.createFirewallRules(zoneId, [
        {
          filter: { expression: ctx.input.expression },
          action: ctx.input.firewallAction,
          description: ctx.input.description,
          paused: ctx.input.paused
        }
      ]);
      let created = response.result[0];
      return {
        output: { createdRule: { ruleId: created.id, action: created.action } },
        message: `Created firewall rule with action **${created.action}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.ruleId) throw cloudflareServiceError('ruleId is required for delete');
      await client.deleteFirewallRule(zoneId, ctx.input.ruleId);
      return {
        output: { deleted: true },
        message: `Deleted firewall rule \`${ctx.input.ruleId}\`.`
      };
    }

    if (action === 'list_custom_rules') {
      let response = await client.listCustomRules(zoneId);
      let rules = (response.result?.rules || []).map((r: any) => ({
        ruleId: r.id,
        expression: r.expression,
        action: r.action,
        description: r.description,
        enabled: r.enabled
      }));
      return {
        output: { rules },
        message: `Found **${rules.length}** WAF custom rule(s).`
      };
    }

    if (action === 'create_custom_rule') {
      if (!ctx.input.expression || !ctx.input.firewallAction) {
        throw cloudflareServiceError('expression and firewallAction are required');
      }

      let response = await client.createCustomRule(zoneId, {
        expression: ctx.input.expression,
        action: ctx.input.firewallAction,
        description: ctx.input.description,
        enabled:
          ctx.input.enabled ?? (ctx.input.paused === undefined ? true : !ctx.input.paused)
      });
      let rules = response.result?.rules || [];
      let created =
        [...rules]
          .reverse()
          .find(
            (r: any) =>
              r.expression === ctx.input.expression &&
              (!ctx.input.description || r.description === ctx.input.description)
          ) ||
        rules[rules.length - 1] ||
        response.result;

      if (!created?.id) {
        throw cloudflareServiceError(
          'Cloudflare did not return the created WAF custom rule ID'
        );
      }

      return {
        output: { createdRule: { ruleId: created.id, action: created.action } },
        message: `Created WAF custom rule with action **${created.action}**.`
      };
    }

    if (action === 'delete_custom_rule') {
      if (!ctx.input.ruleId) throw cloudflareServiceError('ruleId is required for delete');
      await client.deleteCustomRule(zoneId, ctx.input.ruleId);
      return {
        output: { deleted: true },
        message: `Deleted WAF custom rule \`${ctx.input.ruleId}\`.`
      };
    }

    if (action === 'list_ip_rules') {
      let response = await client.listIpAccessRules(zoneId);
      let rules = response.result.map((r: any) => ({
        ruleId: r.id,
        action: r.mode,
        description: `${r.configuration?.target}: ${r.configuration?.value}`,
        paused: false
      }));
      return {
        output: { rules },
        message: `Found **${rules.length}** IP access rule(s).`
      };
    }

    if (action === 'create_ip_rule') {
      if (!ctx.input.ipMode || !ctx.input.ipTarget || !ctx.input.ipValue) {
        throw cloudflareServiceError('ipMode, ipTarget, and ipValue are required');
      }
      let response = await client.createIpAccessRule(zoneId, {
        mode: ctx.input.ipMode,
        configuration: { target: ctx.input.ipTarget, value: ctx.input.ipValue },
        notes: ctx.input.notes
      });
      return {
        output: { createdRule: { ruleId: response.result.id, action: response.result.mode } },
        message: `Created IP access rule: **${ctx.input.ipMode}** ${ctx.input.ipValue}.`
      };
    }

    if (action === 'delete_ip_rule') {
      if (!ctx.input.ruleId) throw cloudflareServiceError('ruleId is required for delete');
      await client.deleteIpAccessRule(zoneId, ctx.input.ruleId);
      return {
        output: { deleted: true },
        message: `Deleted IP access rule \`${ctx.input.ruleId}\`.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
