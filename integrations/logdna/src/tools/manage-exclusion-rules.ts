import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let exclusionRuleOutputSchema = z.object({
  ruleId: z.string().describe('Unique ID of the exclusion rule'),
  title: z.string().optional().describe('Title of the exclusion rule'),
  active: z.boolean().optional().describe('Whether the rule is active'),
  apps: z.array(z.string()).optional().describe('Apps the rule applies to'),
  hosts: z.array(z.string()).optional().describe('Hosts the rule applies to'),
  query: z.string().optional().describe('Query string that matches logs to exclude'),
  indexOnly: z
    .boolean()
    .optional()
    .describe('If true, logs are preserved for search but not stored long-term')
});

export let listExclusionRules = SlateTool.create(spec, {
  name: 'List Exclusion Rules',
  key: 'list_exclusion_rules',
  description: `List all ingestion exclusion rules. Exclusion rules define which logs should be excluded from storage to control costs and reduce noise.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      rules: z.array(exclusionRuleOutputSchema).describe('List of exclusion rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let rules = await client.listExclusionRules();
    let ruleList = Array.isArray(rules) ? rules : [];

    return {
      output: {
        rules: ruleList.map((r: any) => ({
          ruleId: r.id || r.ID || '',
          title: r.title,
          active: r.active,
          apps: r.apps,
          hosts: r.hosts,
          query: r.query,
          indexOnly: r.indexonly
        }))
      },
      message: `Found **${ruleList.length}** exclusion rule(s).`
    };
  })
  .build();

export let createExclusionRule = SlateTool.create(spec, {
  name: 'Create Exclusion Rule',
  key: 'create_exclusion_rule',
  description: `Create a new exclusion rule to prevent certain logs from being stored. Filter by apps, hosts, or query patterns. Optionally use "indexOnly" to keep logs searchable without long-term storage.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      title: z.string().describe('Title for the exclusion rule'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the rule should be active immediately (defaults to true)'),
      apps: z.array(z.string()).optional().describe('App names whose logs should be excluded'),
      hosts: z
        .array(z.string())
        .optional()
        .describe('Hostnames whose logs should be excluded'),
      query: z.string().optional().describe('Query string to match logs for exclusion'),
      indexOnly: z
        .boolean()
        .optional()
        .describe('If true, logs are searchable but not stored long-term')
    })
  )
  .output(exclusionRuleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let r = await client.createExclusionRule({
      title: ctx.input.title,
      active: ctx.input.active,
      apps: ctx.input.apps,
      hosts: ctx.input.hosts,
      query: ctx.input.query,
      indexonly: ctx.input.indexOnly
    });

    return {
      output: {
        ruleId: r.id || r.ID || '',
        title: r.title,
        active: r.active,
        apps: r.apps,
        hosts: r.hosts,
        query: r.query,
        indexOnly: r.indexonly
      },
      message: `Created exclusion rule **${r.title || ctx.input.title}**.`
    };
  })
  .build();

export let updateExclusionRule = SlateTool.create(spec, {
  name: 'Update Exclusion Rule',
  key: 'update_exclusion_rule',
  description: `Update an existing exclusion rule's title, filters, or active state.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      ruleId: z.string().describe('ID of the exclusion rule to update'),
      title: z.string().optional().describe('New title'),
      active: z.boolean().optional().describe('Whether the rule is active'),
      apps: z.array(z.string()).optional().describe('Updated app names'),
      hosts: z.array(z.string()).optional().describe('Updated hostnames'),
      query: z.string().optional().describe('Updated query string'),
      indexOnly: z.boolean().optional().describe('Updated index-only setting')
    })
  )
  .output(exclusionRuleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let updates: any = {};
    if (ctx.input.title !== undefined) updates.title = ctx.input.title;
    if (ctx.input.active !== undefined) updates.active = ctx.input.active;
    if (ctx.input.apps !== undefined) updates.apps = ctx.input.apps;
    if (ctx.input.hosts !== undefined) updates.hosts = ctx.input.hosts;
    if (ctx.input.query !== undefined) updates.query = ctx.input.query;
    if (ctx.input.indexOnly !== undefined) updates.indexonly = ctx.input.indexOnly;

    let r = await client.updateExclusionRule(ctx.input.ruleId, updates);

    return {
      output: {
        ruleId: r.id || r.ID || ctx.input.ruleId,
        title: r.title,
        active: r.active,
        apps: r.apps,
        hosts: r.hosts,
        query: r.query,
        indexOnly: r.indexonly
      },
      message: `Updated exclusion rule **${r.title || ctx.input.ruleId}**.`
    };
  })
  .build();

export let deleteExclusionRule = SlateTool.create(spec, {
  name: 'Delete Exclusion Rule',
  key: 'delete_exclusion_rule',
  description: `Delete an exclusion rule by its ID.`,
  tags: { destructive: true, readOnly: false }
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
    let client = new Client({ serviceKey: ctx.auth.token });
    await client.deleteExclusionRule(ctx.input.ruleId);

    return {
      output: { deleted: true },
      message: `Deleted exclusion rule **${ctx.input.ruleId}**.`
    };
  })
  .build();
