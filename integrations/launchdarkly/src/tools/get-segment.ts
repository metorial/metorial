import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireEnvironmentKey, requireProjectKey } from '../lib/inputs';
import { spec } from '../spec';

let contextTargetsSchema = z.object({
  contextKind: z.string().describe('Context kind'),
  values: z.array(z.string()).describe('Included or excluded context keys')
});

export let getSegment = SlateTool.create(spec, {
  name: 'Get Segment',
  key: 'get_segment',
  description:
    'Retrieve one LaunchDarkly segment, including targeting rules, rule and clause IDs, included and excluded context keys, and big-segment metadata. Use this before updating rules or membership.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectKey: z.string().optional().describe('Project key. Falls back to config default.'),
      environmentKey: z
        .string()
        .optional()
        .describe('Environment key. Falls back to config default.'),
      segmentKey: z.string().describe('Segment key')
    })
  )
  .output(
    z.object({
      segmentKey: z.string().describe('Segment key'),
      name: z.string().describe('Segment name'),
      description: z.string().optional().describe('Segment description'),
      tags: z.array(z.string()).describe('Segment tags'),
      creationDate: z.string().describe('Creation timestamp in Unix milliseconds'),
      lastModifiedDate: z
        .string()
        .optional()
        .describe('Last modification timestamp in Unix milliseconds'),
      version: z.number().optional().describe('Segment configuration version'),
      deleted: z.boolean().describe('Whether the segment is deleted'),
      unbounded: z.boolean().describe('Whether this is a big segment'),
      unboundedContextKind: z.string().optional().describe('Context kind for a big segment'),
      included: z.array(z.string()).describe('Legacy included user keys'),
      excluded: z.array(z.string()).describe('Legacy excluded user keys'),
      includedContexts: z
        .array(contextTargetsSchema)
        .describe('Included context keys grouped by context kind'),
      excludedContexts: z
        .array(contextTargetsSchema)
        .describe('Excluded context keys grouped by context kind'),
      includedCount: z.number().describe('Total number of explicitly included contexts'),
      excludedCount: z.number().describe('Total number of explicitly excluded contexts'),
      rules: z.array(
        z.object({
          ruleId: z.string().describe('Rule ID used by update instructions'),
          description: z.string().optional().describe('Rule description'),
          clauses: z.array(
            z.object({
              clauseId: z.string().describe('Clause ID used by update instructions'),
              contextKind: z.string().optional().describe('Context kind, defaults to user'),
              attribute: z.string().describe('Context attribute'),
              op: z.string().describe('Clause operator'),
              negate: z.boolean().describe('Whether the clause result is negated'),
              values: z.array(z.any()).describe('Values compared by the clause')
            })
          ),
          weight: z.number().optional().describe('Rollout weight in thousandths of a percent'),
          bucketBy: z
            .string()
            .optional()
            .describe('Context attribute used for rollout bucketing'),
          rolloutContextKind: z.string().optional().describe('Context kind used for rollout')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);
    let environmentKey = requireEnvironmentKey(
      ctx.input.environmentKey,
      ctx.config.environmentKey
    );
    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let segment = await client.getSegment(projectKey, environmentKey, ctx.input.segmentKey);
    let included = segment.included ?? [];
    let excluded = segment.excluded ?? [];
    let includedContexts = segment.includedContexts ?? [];
    let excludedContexts = segment.excludedContexts ?? [];

    return {
      output: {
        segmentKey: segment.key,
        name: segment.name,
        description: segment.description,
        tags: segment.tags ?? [],
        creationDate: String(segment.creationDate),
        lastModifiedDate:
          segment.lastModifiedDate === undefined
            ? undefined
            : String(segment.lastModifiedDate),
        version: segment.version,
        deleted: segment.deleted ?? false,
        unbounded: segment.unbounded ?? false,
        unboundedContextKind: segment.unboundedContextKind,
        included,
        excluded,
        includedContexts: includedContexts.map((targets: any) => ({
          contextKind: targets.contextKind,
          values: targets.values ?? []
        })),
        excludedContexts: excludedContexts.map((targets: any) => ({
          contextKind: targets.contextKind,
          values: targets.values ?? []
        })),
        includedCount:
          segment._unboundedMetadata?.includedCount ??
          included.length +
            includedContexts.reduce(
              (count: number, targets: any) => count + (targets.values ?? []).length,
              0
            ),
        excludedCount:
          segment._unboundedMetadata?.excludedCount ??
          excluded.length +
            excludedContexts.reduce(
              (count: number, targets: any) => count + (targets.values ?? []).length,
              0
            ),
        rules: (segment.rules ?? []).map((rule: any) => ({
          ruleId: rule._id,
          description: rule.description,
          clauses: (rule.clauses ?? []).map((clause: any) => ({
            clauseId: clause._id,
            contextKind: clause.contextKind,
            attribute: clause.attribute,
            op: clause.op,
            negate: clause.negate ?? false,
            values: clause.values ?? []
          })),
          weight: rule.weight,
          bucketBy: rule.bucketBy,
          rolloutContextKind: rule.rolloutContextKind
        }))
      },
      message: `Retrieved segment **${segment.name}** (\`${segment.key}\`) from \`${environmentKey}\`.`
    };
  })
  .build();
