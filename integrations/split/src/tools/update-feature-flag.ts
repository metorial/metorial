import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type JsonPatchOp } from '../lib/client';
import { validateBuckets, validateTrafficAllocation } from '../lib/validation';
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

let matcherInputSchema = z.object({
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
  semverBetween: z
    .object({ from: z.string(), to: z.string() })
    .optional()
    .describe(
      'Semantic version bounds for a BETWEEN_SEMVER matcher. Keep between for numeric and date bounds.'
    ),
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
        .describe(
          'Workspace ID. Call list_workspaces to discover IDs. Falls back to the configured default.'
        ),
      flagName: z.string().describe('Name of the feature flag to update.'),
      description: z
        .string()
        .optional()
        .describe('New description for the flag (metadata update).'),
      rolloutStatusId: z
        .string()
        .optional()
        .describe(
          'New rollout status ID (metadata update). Call list_rollout_statuses to discover IDs.'
        ),
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
      throw createApiServiceError(
        'workspaceId is required. Call list_workspaces to discover IDs, then pass the ID or set the default workspace.'
      );
    }

    let envId = ctx.input.environmentId ?? ctx.config.environmentId;
    let definitionRequested = [
      ctx.input.killed,
      ctx.input.treatments,
      ctx.input.defaultTreatment,
      ctx.input.defaultRule,
      ctx.input.rules,
      ctx.input.trafficAllocation,
      ctx.input.impressionsDisabled
    ].some(value => value !== undefined);
    if (definitionRequested && !envId) {
      throw createApiServiceError(
        'environmentId is required for definition changes. Call list_environments to discover IDs, then pass the environment or set the default.'
      );
    }
    if (
      !definitionRequested &&
      ctx.input.description === undefined &&
      ctx.input.rolloutStatusId === undefined
    ) {
      throw createApiServiceError(
        'Provide at least one metadata or environment definition field to update.'
      );
    }
    if (ctx.input.treatments) {
      let names = new Set(ctx.input.treatments.map(treatment => treatment.treatmentName));
      if (!ctx.input.treatments.length || names.size !== ctx.input.treatments.length) {
        throw createApiServiceError(
          'treatments must contain at least one treatment with unique names.'
        );
      }
      if (
        (ctx.input.defaultTreatment !== undefined && !names.has(ctx.input.defaultTreatment)) ||
        ctx.input.defaultRule?.some(bucket => !names.has(bucket.treatment)) ||
        ctx.input.rules?.some(rule =>
          rule.buckets.some(bucket => !names.has(bucket.treatment))
        )
      ) {
        throw createApiServiceError(
          'defaultTreatment and all buckets must reference a supplied treatment when replacing treatments.'
        );
      }
    }
    validateTrafficAllocation(ctx.input.trafficAllocation);
    validateBuckets(ctx.input.defaultRule, 'defaultRule');
    for (let [index, rule] of (ctx.input.rules ?? []).entries()) {
      validateBuckets(rule.buckets, `rules[${index}].buckets`);
      for (let matcher of rule.condition.matchers) {
        if (matcher.semverBetween && (matcher.type !== 'BETWEEN_SEMVER' || matcher.between)) {
          throw createApiServiceError(
            'semverBetween is only valid for BETWEEN_SEMVER and cannot be combined with between.'
          );
        }
      }
    }
    let client = new Client(ctx.auth);
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
    if (envId) {
      // Handle kill/restore separately
      if (ctx.input.killed === true) {
        await client.killFlag(wsId, ctx.input.flagName, envId);
        killedState = true;
        definitionUpdated = true;
      } else if (ctx.input.killed === false) {
        await client.restoreFlag(wsId, ctx.input.flagName, envId);
        killedState = false;
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
        definitionOps.push({
          op: 'replace',
          path: '/rules',
          value: ctx.input.rules.map(rule => ({
            ...rule,
            condition: {
              ...rule.condition,
              matchers: rule.condition.matchers.map(({ semverBetween, ...matcher }) => ({
                ...matcher,
                between: semverBetween ?? matcher.between
              }))
            }
          }))
        });
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
