import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flagDefinitionSchema, mapFlagDefinition } from '../lib/flag-definition';
import { spec } from '../spec';

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
        .describe(
          'Workspace ID. Call list_workspaces to discover IDs. Falls back to the configured default.'
        ),
      flagName: z.string().describe('Name of the feature flag.'),
      environmentIdOrName: z
        .string()
        .optional()
        .describe(
          'Environment ID or name to fetch the flag definition for. Falls back to the configured default; without either, only metadata is returned.'
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
      definition: flagDefinitionSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw createApiServiceError(
        'workspaceId is required. Call list_workspaces to discover IDs, then pass the ID or set the default workspace.'
      );
    }

    let client = new Client(ctx.auth);
    let flag = await client.getFeatureFlag(wsId, ctx.input.flagName);

    let definition: z.infer<typeof flagDefinitionSchema> | undefined;
    let envId = ctx.input.environmentIdOrName ?? ctx.config.environmentId;
    if (envId) {
      let def = await client.getFlagDefinition(wsId, ctx.input.flagName, envId);
      definition = mapFlagDefinition(def);
    }

    return {
      output: {
        flagId: flag.id,
        flagName: flag.name,
        description: flag.description ?? null,
        trafficTypeName: flag.trafficType.name,
        trafficTypeId: flag.trafficType.id,
        creationTime: flag.creationTime,
        tags: (flag.tags ?? []).map(t => t.name),
        rolloutStatus: flag.rolloutStatus?.name ?? null,
        definition
      },
      message: definition
        ? `Retrieved flag **${flag.name}** with definition in environment **${definition.environmentName}** (killed: ${definition.killed}, treatments: ${definition.treatments.length}).`
        : `Retrieved flag **${flag.name}** (metadata only, no environment specified).`
    };
  })
  .build();
