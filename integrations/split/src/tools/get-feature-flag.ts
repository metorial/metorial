import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let treatmentSchema = z.object({
  treatmentName: z.string(),
  description: z.string().optional(),
  configurations: z.string().optional(),
  keys: z.array(z.string()).optional(),
  segments: z.array(z.string()).optional()
});

let bucketSchema = z.object({
  treatment: z.string(),
  size: z.number()
});

let matcherSchema = z.object({
  negate: z.boolean().optional(),
  type: z.string(),
  attribute: z.string().optional(),
  string: z.string().optional(),
  bool: z.boolean().optional(),
  strings: z.array(z.string()).optional(),
  number: z.number().optional(),
  date: z.number().optional(),
  between: z.object({ from: z.number(), to: z.number() }).optional(),
  depends: z.object({ splitName: z.string(), treatment: z.string() }).optional()
});

let ruleSchema = z.object({
  buckets: z.array(bucketSchema),
  condition: z.object({
    combiner: z.string(),
    matchers: z.array(matcherSchema)
  })
});

export let getFeatureFlag = SlateTool.create(spec, {
  name: 'Get Feature Flag',
  key: 'get_feature_flag',
  description: `Retrieve a feature flag's metadata and optionally its full definition in a specific environment. When an environment is provided, returns the complete targeting configuration including treatments, rules, default rule, traffic allocation, and kill status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to the configured default.'),
      flagName: z.string().describe('Name of the feature flag.'),
      environmentIdOrName: z
        .string()
        .optional()
        .describe(
          'Environment ID or name to fetch the flag definition for. If omitted, only metadata is returned.'
        )
    })
  )
  .output(
    z.object({
      flagId: z.string(),
      flagName: z.string(),
      description: z.string().nullable(),
      trafficTypeName: z.string(),
      trafficTypeId: z.string(),
      creationTime: z.number(),
      tags: z.array(z.string()),
      rolloutStatus: z.string().nullable().optional(),
      definition: z
        .object({
          environmentName: z.string(),
          environmentId: z.string(),
          killed: z.boolean(),
          treatments: z.array(treatmentSchema),
          defaultTreatment: z.string(),
          baselineTreatment: z.string().optional(),
          trafficAllocation: z.number(),
          rules: z.array(ruleSchema),
          defaultRule: z.array(bucketSchema),
          lastUpdateTime: z.number(),
          impressionsDisabled: z.boolean().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw new Error('workspaceId is required. Set it in config or pass it as input.');
    }

    let client = new Client({ token: ctx.auth.token });
    let flag = await client.getFeatureFlag(wsId, ctx.input.flagName);

    let definition: any;
    let envId = ctx.input.environmentIdOrName ?? ctx.config.environmentId;
    if (envId) {
      let def = await client.getFlagDefinition(wsId, ctx.input.flagName, envId);
      definition = {
        environmentName: def.environment.name,
        environmentId: def.environment.id,
        killed: def.killed,
        treatments: def.treatments.map(t => ({
          treatmentName: t.name,
          description: t.description,
          configurations: t.configurations,
          keys: t.keys,
          segments: t.segments
        })),
        defaultTreatment: def.defaultTreatment,
        baselineTreatment: def.baselineTreatment,
        trafficAllocation: def.trafficAllocation,
        rules: def.rules,
        defaultRule: def.defaultRule,
        lastUpdateTime: def.lastUpdateTime,
        impressionsDisabled: def.impressionsDisabled
      };
    }

    return {
      output: {
        flagId: flag.id,
        flagName: flag.name,
        description: flag.description,
        trafficTypeName: flag.trafficType.name,
        trafficTypeId: flag.trafficType.id,
        creationTime: flag.creationTime,
        tags: flag.tags.map(t => t.name),
        rolloutStatus: flag.rolloutStatus?.name ?? null,
        definition
      },
      message: definition
        ? `Retrieved flag **${flag.name}** with definition in environment **${definition.environmentName}** (killed: ${definition.killed}, treatments: ${definition.treatments.length}).`
        : `Retrieved flag **${flag.name}** (metadata only, no environment specified).`
    };
  })
  .build();
