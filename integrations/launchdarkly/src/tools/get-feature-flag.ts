import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireProjectKey } from '../lib/inputs';
import { spec } from '../spec';

let variationSchema = z.object({
  variationId: z.string().describe('Variation ID'),
  value: z.any().describe('Variation value'),
  name: z.string().optional().describe('Variation name'),
  description: z.string().optional().describe('Variation description')
});

export let getFeatureFlag = SlateTool.create(spec, {
  name: 'Get Feature Flag',
  key: 'get_feature_flag',
  description: `Retrieve detailed information about a specific feature flag, including its variations, targeting rules, and environment-specific configuration. Use this to inspect a flag's full setup before making changes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectKey: z
        .string()
        .optional()
        .describe('Project key. Falls back to config default if not provided.'),
      flagKey: z.string().describe('The key of the feature flag to retrieve'),
      environmentKey: z
        .string()
        .optional()
        .describe('Environment key to scope the response to a specific environment')
    })
  )
  .output(
    z.object({
      flagKey: z.string().describe('Flag key identifier'),
      name: z.string().describe('Flag display name'),
      description: z.string().describe('Flag description'),
      kind: z.string().describe('Flag kind (boolean, multivariate, etc.)'),
      temporary: z.boolean().describe('Whether the flag is temporary'),
      tags: z.array(z.string()).describe('Tags'),
      variations: z.array(variationSchema).describe('Flag variations'),
      creationDate: z.string().describe('Flag creation timestamp'),
      maintainerEmail: z.string().optional().describe('Maintainer email'),
      on: z
        .boolean()
        .optional()
        .describe('Whether the flag is on in the specified environment'),
      offVariationIndex: z
        .number()
        .optional()
        .describe('Off variation index in the specified environment'),
      prerequisites: z
        .array(
          z.object({
            flagKey: z.string(),
            variationIndex: z.number()
          })
        )
        .optional()
        .describe('Prerequisite flags'),
      targets: z
        .array(
          z.object({
            contextKind: z.string().optional(),
            values: z.array(z.string()),
            variationIndex: z.number()
          })
        )
        .optional()
        .describe('Individual targeting'),
      rules: z
        .array(
          z.object({
            ruleId: z.string().optional(),
            description: z.string().optional(),
            clauses: z
              .array(
                z.object({
                  clauseId: z.string().optional(),
                  contextKind: z.string().optional(),
                  attribute: z.string(),
                  op: z.string(),
                  negate: z.boolean(),
                  values: z.array(z.any())
                })
              )
              .describe('Rule clauses and IDs used by semantic patch instructions'),
            variationIndex: z.number().optional(),
            rollout: z.any().optional(),
            trackEvents: z.boolean().optional()
          })
        )
        .optional()
        .describe('Targeting rules'),
      fallthrough: z
        .object({
          variationIndex: z.number().optional(),
          rollout: z.any().optional()
        })
        .optional()
        .describe('Default serve when targeting is on')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);

    let envKey = ctx.input.environmentKey ?? ctx.config.environmentKey;
    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let flag = await client.getFeatureFlag(projectKey, ctx.input.flagKey, {
      env: envKey
    });

    let envConfig = envKey ? flag.environments?.[envKey] : undefined;

    return {
      output: {
        flagKey: flag.key,
        name: flag.name,
        description: flag.description ?? '',
        kind: flag.kind,
        temporary: flag.temporary ?? false,
        tags: flag.tags ?? [],
        variations: (flag.variations ?? []).map((v: any) => ({
          variationId: v._id,
          value: v.value,
          name: v.name,
          description: v.description
        })),
        creationDate: String(flag.creationDate),
        maintainerEmail: flag._maintainer?.email,
        on: envConfig?.on,
        offVariationIndex: envConfig?.offVariation,
        prerequisites: envConfig?.prerequisites?.map((p: any) => ({
          flagKey: p.key,
          variationIndex: p.variation
        })),
        targets: envConfig
          ? [...(envConfig.targets ?? []), ...(envConfig.contextTargets ?? [])].map(
              (target: any) => ({
                contextKind: target.contextKind ?? 'user',
                values: target.values ?? [],
                variationIndex: target.variation
              })
            )
          : undefined,
        rules: envConfig?.rules?.map((r: any) => ({
          ruleId: r._id,
          description: r.description,
          clauses: (r.clauses ?? []).map((clause: any) => ({
            clauseId: clause._id,
            contextKind: clause.contextKind,
            attribute: clause.attribute,
            op: clause.op,
            negate: clause.negate ?? false,
            values: clause.values ?? []
          })),
          variationIndex: r.variation,
          rollout: r.rollout,
          trackEvents: r.trackEvents
        })),
        fallthrough: envConfig?.fallthrough
          ? {
              variationIndex: envConfig.fallthrough.variation,
              rollout: envConfig.fallthrough.rollout
            }
          : undefined
      },
      message: `Retrieved flag **${flag.name}** (\`${flag.key}\`)${envConfig ? ` — ${envConfig.on ? 'ON' : 'OFF'} in \`${envKey}\`` : ''}.`
    };
  })
  .build();
