import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchRules = SlateTool.create(spec, {
  name: 'Search Alerting Rules',
  key: 'search_rules',
  description: `Search and list Kibana alerting rules. Rules monitor conditions and trigger actions when thresholds are met.
Supports filtering by search terms and KQL filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search query to filter rules by name'),
      filter: z.string().optional().describe('KQL filter expression for advanced filtering'),
      page: z.number().optional().describe('Page number (1-based)'),
      perPage: z.number().optional().describe('Number of results per page (default 20)'),
      sortField: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., "name", "createdAt", "updatedAt")'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching rules'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page'),
      rules: z
        .array(
          z.object({
            ruleId: z.string().describe('Unique ID of the rule'),
            name: z.string().describe('Name of the rule'),
            ruleTypeId: z.string().describe('Type of the rule'),
            consumer: z.string().describe('Application that owns the rule'),
            enabled: z.boolean().describe('Whether the rule is enabled'),
            tags: z.array(z.string()).describe('Tags assigned to the rule'),
            schedule: z
              .object({
                interval: z.string().describe('Check interval (e.g., "1m", "5m")')
              })
              .describe('Rule check schedule'),
            lastRun: z.any().optional().describe('Last run information'),
            nextRun: z.string().optional().describe('Next scheduled run timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('List of alerting rules')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.findRules({
      search: ctx.input.search,
      filter: ctx.input.filter,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortField: ctx.input.sortField,
      sortOrder: ctx.input.sortOrder
    });

    let rules = (result.data ?? []).map((r: any) => ({
      ruleId: r.id,
      name: r.name,
      ruleTypeId: r.rule_type_id,
      consumer: r.consumer,
      enabled: r.enabled,
      tags: r.tags ?? [],
      schedule: r.schedule,
      lastRun: r.last_run,
      nextRun: r.next_run,
      updatedAt: r.updated_at,
      createdAt: r.created_at
    }));

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.per_page ?? 20,
        rules
      },
      message: `Found **${result.total ?? 0}** alerting rules${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}.`
    };
  })
  .build();
