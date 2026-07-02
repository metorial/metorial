import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient } from '../lib/client';
import { spec } from '../spec';

let exclusionRuleOutput = z.object({
  ruleId: z.string().describe('Unique exclusion rule identifier'),
  title: z.string().describe('Rule title'),
  active: z.boolean().describe('Whether the rule is active'),
  apps: z.array(z.string()).optional().describe('Applications to match'),
  hosts: z.array(z.string()).optional().describe('Hostnames to match'),
  query: z.string().optional().describe('Query pattern to match'),
  indexOnly: z
    .boolean()
    .optional()
    .describe('If true, matched lines are indexed but not stored')
});

export let listExclusionRules = SlateTool.create(spec, {
  name: 'List Exclusion Rules',
  key: 'list_exclusion_rules',
  description: `List all ingestion exclusion rules. Exclusion rules prevent matching log lines from being stored, helping control storage costs and filter noise.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      rules: z.array(exclusionRuleOutput).describe('List of exclusion rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let rules = await client.listExclusionRules();

    let mapped = (Array.isArray(rules) ? rules : []).map(r => ({
      ruleId: r.id || '',
      title: r.title || '',
      active: r.active ?? false,
      apps: r.apps,
      hosts: r.hosts,
      query: r.query,
      indexOnly: r.indexonly
    }));

    return {
      output: { rules: mapped },
      message: `Found **${mapped.length}** exclusion rule(s).`
    };
  })
  .build();

export let createExclusionRule = SlateTool.create(spec, {
  name: 'Create Exclusion Rule',
  key: 'create_exclusion_rule',
  description: `Create an exclusion rule to prevent matching log lines from being stored. Matching can be based on application names, hostnames, or search queries.`,
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      title: z.string().describe('Name of the exclusion rule'),
      active: z.boolean().optional().describe('Whether the rule should be active immediately'),
      apps: z.array(z.string()).optional().describe('Application names to match'),
      hosts: z.array(z.string()).optional().describe('Hostnames to match'),
      query: z.string().optional().describe('Search query pattern to match'),
      indexOnly: z
        .boolean()
        .optional()
        .describe('If true, lines are indexed (searchable) but not stored long-term')
    })
  )
  .output(exclusionRuleOutput)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });

    let result = await client.createExclusionRule({
      title: ctx.input.title,
      active: ctx.input.active,
      apps: ctx.input.apps,
      hosts: ctx.input.hosts,
      query: ctx.input.query,
      indexonly: ctx.input.indexOnly
    });

    return {
      output: {
        ruleId: result.id || '',
        title: result.title || '',
        active: result.active ?? false,
        apps: result.apps,
        hosts: result.hosts,
        query: result.query,
        indexOnly: result.indexonly
      },
      message: `Created exclusion rule **${result.title}** with ID \`${result.id}\`.`
    };
  })
  .build();

export let updateExclusionRule = SlateTool.create(spec, {
  name: 'Update Exclusion Rule',
  key: 'update_exclusion_rule',
  description: `Update an existing exclusion rule's title, filters, or active status.`,
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      ruleId: z.string().describe('ID of the exclusion rule to update'),
      title: z.string().optional().describe('Updated rule title'),
      active: z.boolean().optional().describe('Updated active status'),
      apps: z.array(z.string()).optional().describe('Updated application filter'),
      hosts: z.array(z.string()).optional().describe('Updated hostname filter'),
      query: z.string().optional().describe('Updated query pattern'),
      indexOnly: z.boolean().optional().describe('Updated index-only setting')
    })
  )
  .output(exclusionRuleOutput)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });

    let result = await client.updateExclusionRule(ctx.input.ruleId, {
      title: ctx.input.title,
      active: ctx.input.active,
      apps: ctx.input.apps,
      hosts: ctx.input.hosts,
      query: ctx.input.query,
      indexonly: ctx.input.indexOnly
    });

    return {
      output: {
        ruleId: result.id || '',
        title: result.title || '',
        active: result.active ?? false,
        apps: result.apps,
        hosts: result.hosts,
        query: result.query,
        indexOnly: result.indexonly
      },
      message: `Updated exclusion rule **${result.title}** (\`${result.id}\`).`
    };
  })
  .build();

export let deleteExclusionRule = SlateTool.create(spec, {
  name: 'Delete Exclusion Rule',
  key: 'delete_exclusion_rule',
  description: `Delete an exclusion rule. Log lines that were previously excluded will begin being stored again.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      ruleId: z.string().describe('ID of the exclusion rule to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the rule was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    await client.deleteExclusionRule(ctx.input.ruleId);

    return {
      output: { deleted: true },
      message: `Deleted exclusion rule \`${ctx.input.ruleId}\`.`
    };
  })
  .build();
