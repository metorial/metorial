import { z } from 'zod';
import {
  createClient,
  mapRule,
  pageSchema,
  paginationInputs,
  rawRecordSchema,
  readOnlyTool,
  ruleSchema
} from './shared';

export let searchRulesTool = readOnlyTool({
  name: 'Search Rules',
  key: 'search_rules',
  description:
    'Search SonarQube rules by text query, language, repository, tags, severity, type, and status. Use this before get_rule when the exact rule key is unknown.'
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Optional SonarQube Cloud organization key. Ignored for SonarQube Server.'),
      query: z.string().optional().describe('Search text for rule key, name, or description.'),
      languages: z.array(z.string()).optional().describe('Language keys to filter rules.'),
      repositories: z.array(z.string()).optional().describe('Rule repositories to filter.'),
      tags: z.array(z.string()).optional().describe('Rule tags to filter.'),
      severities: z
        .array(z.string())
        .optional()
        .describe('Rule severities, for example BLOCKER, CRITICAL, MAJOR, MINOR, INFO.'),
      types: z
        .array(z.string())
        .optional()
        .describe('Rule types, for example BUG, VULNERABILITY, or CODE_SMELL.'),
      statuses: z
        .array(z.string())
        .optional()
        .describe('Rule statuses, for example READY, BETA, DEPRECATED, or REMOVED.'),
      ...paginationInputs(100, 500)
    })
  )
  .output(
    z.object({
      rules: z.array(ruleSchema).describe('Matching SonarQube rules.'),
      page: pageSchema.optional().describe('Pagination details.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.searchRules(ctx.input);
    let rules = result.items.map(mapRule);

    return {
      output: {
        rules,
        page: result.page
      },
      message: `Found **${rules.length}** SonarQube rules.`
    };
  })
  .build();

export let getRuleTool = readOnlyTool({
  name: 'Get Rule',
  key: 'get_rule',
  description:
    'Get one SonarQube rule by exact rule key, including rule metadata and raw remediation details returned by SonarQube.'
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe(
          'SonarQube Cloud organization key. Required on Cloud through input or config; ignored for Server.'
        ),
      ruleKey: z.string().describe('SonarQube rule key, for example java:S1135.')
    })
  )
  .output(
    z.object({
      ruleKey: z.string().describe('Rule key used for the request.'),
      rule: ruleSchema.describe('Normalized SonarQube rule.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getRule(ctx.input.ruleKey, ctx.input.organization);
    let rule =
      typeof data.rule === 'object' && data.rule !== null
        ? (data.rule as Record<string, unknown>)
        : data;

    return {
      output: {
        ruleKey: ctx.input.ruleKey,
        rule: mapRule(rule),
        raw: data
      },
      message: `Retrieved SonarQube rule **${ctx.input.ruleKey}**.`
    };
  })
  .build();
