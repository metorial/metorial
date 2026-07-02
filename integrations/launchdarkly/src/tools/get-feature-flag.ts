import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
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
            variationIndex: z.number().optional(),
            rollout: z.any().optional()
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
    let projectKey = ctx.input.projectKey ?? ctx.config.projectKey;
    if (!projectKey) {
      throw new Error(
        'projectKey is required. Provide it in the input or set a default in config.'
      );
    }

    let envKey = ctx.input.environmentKey ?? ctx.config.environmentKey;
    let client = new LaunchDarklyClient(ctx.auth.token);
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
        targets: envConfig?.targets?.map((t: any) => ({
          contextKind: t.contextKind,
          values: t.values ?? [],
          variationIndex: t.variation
        })),
        rules: envConfig?.rules?.map((r: any) => ({
          ruleId: r._id,
          description: r.description,
          variationIndex: r.variation,
          rollout: r.rollout
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
