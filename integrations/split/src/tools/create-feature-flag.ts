import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let treatmentInputSchema = z.object({
  treatmentName: z.string().describe('Name of the treatment (e.g., "on", "off", "v1").'),
  description: z.string().optional().describe('Description of what this treatment does.'),
  configurations: z.string().optional().describe('JSON string of treatment configuration.')
});

let bucketInputSchema = z.object({
  treatment: z.string().describe('Treatment name.'),
  size: z
    .number()
    .describe('Percentage allocation (0-100). All bucket sizes in a rule must sum to 100.')
});

export let createFeatureFlag = SlateTool.create(spec, {
  name: 'Create Feature Flag',
  key: 'create_feature_flag',
  description: `Create a new feature flag in a Split workspace and optionally set up its initial definition in an environment. If treatments, defaultTreatment, and defaultRule are provided along with an environment, the flag definition will be created immediately.`,
  instructions: [
    'The flag name must be unique within the workspace and is case-sensitive.',
    'To activate a flag in an environment, provide environmentId along with treatments, defaultTreatment, and defaultRule.'
  ]
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to the configured default.'),
      trafficTypeName: z
        .string()
        .describe('Traffic type name or ID to associate the flag with (e.g., "user").'),
      flagName: z.string().describe('Unique name for the feature flag.'),
      description: z.string().optional().describe('Description of the feature flag.'),
      environmentId: z
        .string()
        .optional()
        .describe('If provided, creates the flag definition in this environment.'),
      treatments: z
        .array(treatmentInputSchema)
        .optional()
        .describe(
          'Treatments for the flag definition. Required if environmentId is provided.'
        ),
      defaultTreatment: z
        .string()
        .optional()
        .describe(
          'The treatment served when no rules match. Required if environmentId is provided.'
        ),
      defaultRule: z
        .array(bucketInputSchema)
        .optional()
        .describe(
          'Default rule for percentage-based rollout. Required if environmentId is provided.'
        ),
      trafficAllocation: z
        .number()
        .optional()
        .describe('Percentage of traffic to include in the flag (0-100). Defaults to 100.')
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
      definitionCreated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw new Error('workspaceId is required. Set it in config or pass it as input.');
    }

    let client = new Client({ token: ctx.auth.token });

    let flag = await client.createFeatureFlag(wsId, ctx.input.trafficTypeName, {
      name: ctx.input.flagName,
      description: ctx.input.description
    });

    let definitionCreated = false;
    let envId = ctx.input.environmentId ?? ctx.config.environmentId;

    if (envId && ctx.input.treatments && ctx.input.defaultTreatment && ctx.input.defaultRule) {
      await client.createFlagDefinition(wsId, ctx.input.flagName, envId, {
        treatments: ctx.input.treatments.map(t => ({
          name: t.treatmentName,
          description: t.description,
          configurations: t.configurations
        })),
        defaultTreatment: ctx.input.defaultTreatment,
        defaultRule: ctx.input.defaultRule,
        trafficAllocation: ctx.input.trafficAllocation
      });
      definitionCreated = true;
    }

    return {
      output: {
        flagId: flag.id,
        flagName: flag.name,
        description: flag.description,
        trafficTypeName: flag.trafficType.name,
        trafficTypeId: flag.trafficType.id,
        creationTime: flag.creationTime,
        definitionCreated
      },
      message: definitionCreated
        ? `Created feature flag **${flag.name}** with definition in environment **${envId}**.`
        : `Created feature flag **${flag.name}**. No environment definition was created.`
    };
  })
  .build();
