import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRuleset = SlateTool.create(spec, {
  name: 'Manage Ruleset',
  key: 'manage_ruleset',
  description: `Create, update, retrieve, list, or delete rulesets and their individual rules. Rulesets group rules that steer LLM behavior and can be associated with Assistants and Structures. This tool handles both rulesets and rules in a single interface.`,
  instructions: [
    'For rulesets: use "create_ruleset", "get_ruleset", "update_ruleset", "delete_ruleset", or "list_rulesets".',
    'For rules: use "create_rule", "get_rule", "update_rule", "delete_rule", or "list_rules".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create_ruleset',
          'get_ruleset',
          'update_ruleset',
          'delete_ruleset',
          'list_rulesets',
          'create_rule',
          'get_rule',
          'update_rule',
          'delete_rule',
          'list_rules'
        ])
        .describe('Operation to perform'),
      rulesetId: z.string().optional().describe('Ruleset ID'),
      ruleId: z.string().optional().describe('Rule ID'),
      name: z.string().optional().describe('Name for the ruleset or rule'),
      alias: z.string().optional().describe('Alias for the ruleset'),
      description: z.string().optional().describe('Description for the ruleset'),
      ruleText: z.string().optional().describe('Rule text content (for rule operations)'),
      ruleIds: z.array(z.string()).optional().describe('Rule IDs to attach to a ruleset'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Page size (for list)'),
      aliasFilter: z
        .string()
        .optional()
        .describe('Filter rulesets by alias (for list_rulesets)')
    })
  )
  .output(
    z.object({
      rulesetId: z.string().optional().describe('Ruleset ID'),
      ruleId: z.string().optional().describe('Rule ID'),
      name: z.string().optional().describe('Name'),
      alias: z.string().optional().describe('Ruleset alias'),
      description: z.string().optional().describe('Description'),
      ruleText: z.string().optional().describe('Rule text content'),
      ruleIds: z.array(z.string()).optional().describe('Attached rule IDs'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the resource was deleted'),
      rulesets: z
        .array(
          z.object({
            rulesetId: z.string().describe('Ruleset ID'),
            name: z.string().describe('Ruleset name'),
            alias: z.string().optional().describe('Ruleset alias'),
            description: z.string().optional().describe('Description'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of rulesets'),
      rules: z
        .array(
          z.object({
            ruleId: z.string().describe('Rule ID'),
            name: z.string().describe('Rule name'),
            ruleText: z.string().describe('Rule text'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of rules'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    // ── Ruleset Operations ─────────────────────
    if (ctx.input.action === 'create_ruleset') {
      if (!ctx.input.name) throw new Error('Name is required');
      let result = await client.createRuleset({
        name: ctx.input.name,
        alias: ctx.input.alias,
        description: ctx.input.description,
        metadata: ctx.input.metadata,
        ruleIds: ctx.input.ruleIds
      });
      return {
        output: {
          rulesetId: result.ruleset_id,
          name: result.name,
          alias: result.alias,
          description: result.description,
          ruleIds: result.rule_ids,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Created ruleset **${result.name}** (${result.ruleset_id}).`
      };
    }

    if (ctx.input.action === 'get_ruleset') {
      if (!ctx.input.rulesetId) throw new Error('rulesetId is required');
      let result = await client.getRuleset(ctx.input.rulesetId);
      return {
        output: {
          rulesetId: result.ruleset_id,
          name: result.name,
          alias: result.alias,
          description: result.description,
          ruleIds: result.rule_ids,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Retrieved ruleset **${result.name}**.`
      };
    }

    if (ctx.input.action === 'update_ruleset') {
      if (!ctx.input.rulesetId) throw new Error('rulesetId is required');
      let result = await client.updateRuleset(ctx.input.rulesetId, {
        name: ctx.input.name,
        alias: ctx.input.alias,
        description: ctx.input.description,
        metadata: ctx.input.metadata,
        ruleIds: ctx.input.ruleIds
      });
      return {
        output: {
          rulesetId: result.ruleset_id,
          name: result.name,
          alias: result.alias,
          description: result.description,
          ruleIds: result.rule_ids,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Updated ruleset **${result.name}**.`
      };
    }

    if (ctx.input.action === 'delete_ruleset') {
      if (!ctx.input.rulesetId) throw new Error('rulesetId is required');
      await client.deleteRuleset(ctx.input.rulesetId);
      return {
        output: { rulesetId: ctx.input.rulesetId, deleted: true },
        message: `Deleted ruleset ${ctx.input.rulesetId}.`
      };
    }

    if (ctx.input.action === 'list_rulesets') {
      let result = await client.listRulesets({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        alias: ctx.input.aliasFilter
      });
      let rulesets = result.items.map((r: any) => ({
        rulesetId: r.ruleset_id,
        name: r.name,
        alias: r.alias,
        description: r.description,
        createdAt: r.created_at
      }));
      return {
        output: { rulesets, totalCount: result.pagination.totalCount },
        message: `Found **${result.pagination.totalCount}** ruleset(s).`
      };
    }

    // ── Rule Operations ────────────────────────
    if (ctx.input.action === 'create_rule') {
      if (!ctx.input.name) throw new Error('Name is required');
      if (!ctx.input.ruleText) throw new Error('ruleText is required');
      let result = await client.createRule({
        name: ctx.input.name,
        rule: ctx.input.ruleText,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          ruleId: result.rule_id,
          name: result.name,
          ruleText: result.rule,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Created rule **${result.name}** (${result.rule_id}).`
      };
    }

    if (ctx.input.action === 'get_rule') {
      if (!ctx.input.ruleId) throw new Error('ruleId is required');
      let result = await client.getRule(ctx.input.ruleId);
      return {
        output: {
          ruleId: result.rule_id,
          name: result.name,
          ruleText: result.rule,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Retrieved rule **${result.name}**.`
      };
    }

    if (ctx.input.action === 'update_rule') {
      if (!ctx.input.ruleId) throw new Error('ruleId is required');
      let result = await client.updateRule(ctx.input.ruleId, {
        name: ctx.input.name,
        rule: ctx.input.ruleText,
        metadata: ctx.input.metadata
      });
      return {
        output: {
          ruleId: result.rule_id,
          name: result.name,
          ruleText: result.rule,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        },
        message: `Updated rule **${result.name}**.`
      };
    }

    if (ctx.input.action === 'delete_rule') {
      if (!ctx.input.ruleId) throw new Error('ruleId is required');
      await client.deleteRule(ctx.input.ruleId);
      return {
        output: { ruleId: ctx.input.ruleId, deleted: true },
        message: `Deleted rule ${ctx.input.ruleId}.`
      };
    }

    if (ctx.input.action === 'list_rules') {
      let result = await client.listRules({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize,
        rulesetId: ctx.input.rulesetId
      });
      let rules = result.items.map((r: any) => ({
        ruleId: r.rule_id,
        name: r.name,
        ruleText: r.rule,
        createdAt: r.created_at
      }));
      return {
        output: { rules, totalCount: result.pagination.totalCount },
        message: `Found **${result.pagination.totalCount}** rule(s).`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
