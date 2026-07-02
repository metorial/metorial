import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type JsonPatchOp } from '../lib/client';
import { spec } from '../spec';

let bucketInputSchema = z.object({
  treatment: z.string(),
  size: z.number()
});

let treatmentInputSchema = z.object({
  treatmentName: z.string(),
  description: z.string().optional(),
  configurations: z.string().optional(),
  keys: z.array(z.string()).optional(),
  segments: z.array(z.string()).optional()
});

let matcherInputSchema: z.ZodType<any> = z.object({
  negate: z.boolean().optional(),
  type: z
    .string()
    .describe('Matcher type, e.g., IN_SEGMENT, IN_LIST_STRING, EQUAL_NUMBER, BOOLEAN, etc.'),
  attribute: z.string().optional(),
  string: z.string().optional(),
  bool: z.boolean().optional(),
  strings: z.array(z.string()).optional(),
  number: z.number().optional(),
  date: z.number().optional(),
  between: z.object({ from: z.number(), to: z.number() }).optional(),
  depends: z.object({ splitName: z.string(), treatment: z.string() }).optional()
});

let ruleInputSchema = z.object({
  buckets: z.array(bucketInputSchema),
  condition: z.object({
    combiner: z.string().describe('Usually "AND".'),
    matchers: z.array(matcherInputSchema)
  })
});

export let updateFeatureFlag = SlateTool.create(spec, {
  name: 'Update Feature Flag',
  key: 'update_feature_flag',
  description: `Update a feature flag's metadata (description, rollout status) or its environment-level definition (treatments, rules, default rule, traffic allocation, individual targeting keys). Combines multiple update capabilities into a single tool. Provide the environment to update the targeting definition; omit it to update only metadata.`,
  instructions: [
    'To update metadata like description, provide the new description directly.',
    'To update the flag definition in an environment, provide the environmentId and the fields to change.',
    'When updating rules or defaultRule, provide the complete replacement array.',
    'Bucket sizes within a rule or defaultRule must sum to 100.'
  ]
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to the configured default.'),
      flagName: z.string().describe('Name of the feature flag to update.'),
      description: z
        .string()
        .optional()
        .describe('New description for the flag (metadata update).'),
      rolloutStatusId: z
        .string()
        .optional()
        .describe('New rollout status ID (metadata update).'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID to update the definition in.'),
      killed: z
        .boolean()
        .optional()
        .describe('Set to true to kill the flag, false to restore it.'),
      treatments: z
        .array(treatmentInputSchema)
        .optional()
        .describe('Full replacement of all treatments.'),
      defaultTreatment: z.string().optional().describe('New default treatment name.'),
      defaultRule: z
        .array(bucketInputSchema)
        .optional()
        .describe('New default rule with percentage buckets.'),
      rules: z
        .array(ruleInputSchema)
        .optional()
        .describe('Full replacement of all targeting rules.'),
      trafficAllocation: z
        .number()
        .optional()
        .describe('New traffic allocation percentage (0-100).'),
      impressionsDisabled: z
        .boolean()
        .optional()
        .describe('Disable or enable impression tracking.')
    })
  )
  .output(
    z.object({
      flagName: z.string(),
      metadataUpdated: z.boolean(),
      definitionUpdated: z.boolean(),
      killed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    if (!wsId) {
      throw new Error('workspaceId is required. Set it in config or pass it as input.');
    }

    let client = new Client({ token: ctx.auth.token });
    let metadataUpdated = false;
    let definitionUpdated = false;
    let killedState: boolean | undefined;

    // Metadata updates (description, rolloutStatus)
    let metadataOps: JsonPatchOp[] = [];
    if (ctx.input.description !== undefined) {
      metadataOps.push({ op: 'replace', path: '/description', value: ctx.input.description });
    }
    if (ctx.input.rolloutStatusId !== undefined) {
      metadataOps.push({
        op: 'replace',
        path: '/rolloutStatus/id',
        value: ctx.input.rolloutStatusId
      });
    }
    if (metadataOps.length > 0) {
      await client.updateFeatureFlagMetadata(wsId, ctx.input.flagName, metadataOps);
      metadataUpdated = true;
    }

    // Definition updates (environment-level)
    let envId = ctx.input.environmentId ?? ctx.config.environmentId;
    if (envId) {
      // Handle kill/restore separately
      if (ctx.input.killed === true) {
        let def = await client.killFlag(wsId, ctx.input.flagName, envId);
        killedState = def.killed;
        definitionUpdated = true;
      } else if (ctx.input.killed === false) {
        let def = await client.restoreFlag(wsId, ctx.input.flagName, envId);
        killedState = def.killed;
        definitionUpdated = true;
      }

      // Build patch operations for definition fields
      let definitionOps: JsonPatchOp[] = [];

      if (ctx.input.treatments !== undefined) {
        definitionOps.push({
          op: 'replace',
          path: '/treatments',
          value: ctx.input.treatments.map(t => ({
            name: t.treatmentName,
            description: t.description,
            configurations: t.configurations,
            keys: t.keys,
            segments: t.segments
          }))
        });
      }
      if (ctx.input.defaultTreatment !== undefined) {
        definitionOps.push({
          op: 'replace',
          path: '/defaultTreatment',
          value: ctx.input.defaultTreatment
        });
      }
      if (ctx.input.defaultRule !== undefined) {
        definitionOps.push({
          op: 'replace',
          path: '/defaultRule',
          value: ctx.input.defaultRule
        });
      }
      if (ctx.input.rules !== undefined) {
        definitionOps.push({ op: 'replace', path: '/rules', value: ctx.input.rules });
      }
      if (ctx.input.trafficAllocation !== undefined) {
        definitionOps.push({
          op: 'replace',
          path: '/trafficAllocation',
          value: ctx.input.trafficAllocation
        });
      }
      if (ctx.input.impressionsDisabled !== undefined) {
        definitionOps.push({
          op: 'replace',
          path: '/impressionsDisabled',
          value: ctx.input.impressionsDisabled
        });
      }

      if (definitionOps.length > 0) {
        let def = await client.updateFlagDefinition(
          wsId,
          ctx.input.flagName,
          envId,
          definitionOps
        );
        killedState = def.killed;
        definitionUpdated = true;
      }
    }

    return {
      output: {
        flagName: ctx.input.flagName,
        metadataUpdated,
        definitionUpdated,
        killed: killedState
      },
      message: `Updated flag **${ctx.input.flagName}**: metadata=${metadataUpdated}, definition=${definitionUpdated}${killedState !== undefined ? `, killed=${killedState}` : ''}.`
    };
  })
  .build();
