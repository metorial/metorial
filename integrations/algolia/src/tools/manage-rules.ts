import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AlgoliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageRules = SlateTool.create(spec, {
  name: 'Manage Rules',
  key: 'manage_rules',
  description: `Manage query rules on an Algolia index. Get, search, save, batch save, delete, or clear rules. Query rules let you customize search results by pinning items, adding banners, filtering results, or modifying ranking for specific queries.`,
  instructions: [
    'To **get** a single rule, set action to "get" and provide indexName and ruleId.',
    'To **search** rules, set action to "search" and provide indexName with an optional searchQuery.',
    'To **save** a single rule, set action to "save" and provide indexName, ruleId, and the rule object.',
    'To **save a batch** of rules, set action to "saveBatch" and provide indexName and the rules array.',
    'To **delete** a single rule, set action to "delete" and provide indexName and ruleId.',
    'To **clear** all rules from an index, set action to "clear" and provide indexName.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'search', 'save', 'saveBatch', 'delete', 'clear'])
        .describe('The rules management action to perform'),
      indexName: z.string().describe('Name of the Algolia index'),
      ruleId: z
        .string()
        .optional()
        .describe('Object ID of the rule (required for get, save, delete)'),
      rule: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Rule object to save (required for save). Include consequence and optional conditions, description, enabled, and validity. The ruleId supplies objectID. Legacy condition remains accepted.'
        ),
      rules: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe(
          'Array of rule objects to save in batch (required for saveBatch). Each rule must include an objectID.'
        ),
      searchQuery: z
        .string()
        .optional()
        .describe('Search query to filter rules (for search action)'),
      page: z.number().optional().describe('Zero-based result page for search action.'),
      hitsPerPage: z
        .number()
        .optional()
        .describe('Results per page for search action, from 1 to 1000.'),
      forwardToReplicas: z
        .boolean()
        .optional()
        .describe('Whether to forward the operation to replica indices'),
      clearExistingRules: z
        .boolean()
        .optional()
        .describe(
          'Whether to clear existing rules before saving the batch (for saveBatch action)'
        )
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = new AlgoliaClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      analyticsRegion: ctx.config.analyticsRegion
    });

    let {
      action,
      indexName,
      ruleId,
      rule,
      rules,
      searchQuery,
      forwardToReplicas,
      clearExistingRules
    } = ctx.input;

    if (action === 'get') {
      if (!ruleId) throw createApiServiceError('ruleId is required for get action');
      let result = await client.getRule(indexName, ruleId);
      return {
        output: result,
        message: `Retrieved rule **${ruleId}** from index **${indexName}**.`
      };
    }

    if (action === 'search') {
      let params: Record<string, any> = {};
      if (searchQuery !== undefined) params.query = searchQuery;
      if (ctx.input.page !== undefined) params.page = ctx.input.page;
      if (ctx.input.hitsPerPage !== undefined) params.hitsPerPage = ctx.input.hitsPerPage;
      let result = await client.searchRules(indexName, params);
      let count = result.hits?.length ?? 0;
      return {
        output: result,
        message: `Found **${count}** rule(s) in index **${indexName}**.`
      };
    }

    if (action === 'save') {
      if (!ruleId) throw createApiServiceError('ruleId is required for save action');
      if (!rule) throw createApiServiceError('rule is required for save action');
      let result = await client.saveRule(indexName, ruleId, rule, forwardToReplicas);
      return {
        output: result,
        message: `Saved rule **${ruleId}** to index **${indexName}**.`
      };
    }

    if (action === 'saveBatch') {
      if (!rules || rules.length === 0)
        throw createApiServiceError('rules array is required for saveBatch action');
      let result = await client.saveRules(
        indexName,
        rules,
        forwardToReplicas,
        clearExistingRules
      );
      return {
        output: result,
        message: `Saved **${rules.length}** rule(s) to index **${indexName}**${clearExistingRules ? ' (cleared existing rules)' : ''}.`
      };
    }

    if (action === 'delete') {
      if (!ruleId) throw createApiServiceError('ruleId is required for delete action');
      let result = await client.deleteRule(indexName, ruleId, forwardToReplicas);
      return {
        output: result,
        message: `Deleted rule **${ruleId}** from index **${indexName}**.`
      };
    }

    // action === 'clear'
    let result = await client.clearRules(indexName, forwardToReplicas);
    return {
      output: result,
      message: `Cleared all rules from index **${indexName}**.`
    };
  })
  .build();
