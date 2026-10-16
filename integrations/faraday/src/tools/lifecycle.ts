import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let resourceSchema = z.object({
  resourceId: z.string().describe('Provider resource UUID'),
  name: z.string().describe('Resource name'),
  status: z.string().describe('Provider processing status'),
  raw: z.record(z.string(), z.any()).describe('Complete provider resource metadata')
});
let resourceOutput = (resource: Record<string, any>) => ({
  resourceId: resource.id,
  name: resource.name,
  status: resource.status,
  raw: resource
});
let requireChanges = (body: Record<string, unknown>) => {
  if (!Object.keys(body).length) {
    throw createApiServiceError('Provide at least one field to update.');
  }
};

export let updateOutcome = SlateTool.create(spec, {
  name: 'Update Outcome',
  key: 'update_outcome',
  description:
    'Update an outcome configuration, change its cohort inputs, or turn off preview to start modeling.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      outcomeId: z.string().describe('Outcome UUID from list_outcomes'),
      name: z.string().optional(),
      attainmentCohortId: z.string().optional(),
      eligibleCohortId: z
        .string()
        .nullable()
        .optional()
        .describe('Eligible cohort UUID; null clears the restriction'),
      attritionCohortId: z
        .string()
        .nullable()
        .optional()
        .describe('Counterexample cohort UUID; null clears it'),
      predictionMode: z.enum(['auto', 'static']).optional(),
      biasMitigation: z
        .object({
          age: z.enum(['none', 'equality', 'equity']).optional(),
          gender: z.enum(['none', 'equality', 'equity']).optional()
        })
        .nullable()
        .optional(),
      featureBlocklist: z.array(z.string()).nullable().optional(),
      preview: z
        .boolean()
        .optional()
        .describe('False starts modeling for an outcome held in preview')
    })
  )
  .output(resourceSchema)
  .handleInvocation(async ctx => {
    let body = pickDefined({
      name: ctx.input.name,
      attainment_cohort_id: ctx.input.attainmentCohortId,
      eligible_cohort_id: ctx.input.eligibleCohortId,
      attrition_cohort_id: ctx.input.attritionCohortId,
      prediction_mode: ctx.input.predictionMode,
      bias_mitigation: ctx.input.biasMitigation,
      feature_blocklist: ctx.input.featureBlocklist,
      preview: ctx.input.preview
    });
    requireChanges(body);
    let resource = await new FaradayClient(ctx.auth).updateOutcome(ctx.input.outcomeId, body);
    return {
      output: resourceOutput(resource),
      message: `Updated outcome **${resource.name}**.`
    };
  })
  .build();

export let updatePersonaSet = SlateTool.create(spec, {
  name: 'Update Persona Set',
  key: 'update_persona_set',
  description:
    'Rename a persona set, change its cluster count, or turn off preview to start segmentation.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      personaSetId: z.string().describe('Persona set UUID from list_persona_sets'),
      name: z.string().optional(),
      personaCount: z
        .number()
        .nullable()
        .optional()
        .describe('Integer cluster count; null restores automatic selection'),
      preview: z.boolean().optional()
    })
  )
  .output(resourceSchema)
  .handleInvocation(async ctx => {
    if (
      ctx.input.personaCount !== undefined &&
      ctx.input.personaCount !== null &&
      !Number.isInteger(ctx.input.personaCount)
    ) {
      throw createApiServiceError('personaCount must be an integer number of clusters.');
    }
    let body = pickDefined({
      name: ctx.input.name,
      number_of_clusters: ctx.input.personaCount,
      preview: ctx.input.preview
    });
    requireChanges(body);
    let resource = await new FaradayClient(ctx.auth).updatePersonaSet(
      ctx.input.personaSetId,
      body
    );
    return {
      output: resourceOutput(resource),
      message: `Updated persona set **${resource.name}**.`
    };
  })
  .build();

export let updateScope = SlateTool.create(spec, {
  name: 'Update Scope',
  key: 'update_scope',
  description: 'Update a prediction pipeline population, payload, name, or preview setting.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      scopeId: z.string().describe('Scope UUID from list_scopes'),
      name: z.string().optional(),
      population: z
        .object({
          cohortIds: z
            .array(z.string())
            .optional()
            .describe('Included cohort UUIDs; an empty list selects the US population'),
          exclusionCohortIds: z.array(z.string()).optional(),
          exclusionAddressLevelCohortIds: z.array(z.string()).optional()
        })
        .optional(),
      payload: z
        .object({
          outcomeIds: z.array(z.string()).optional(),
          personaSetIds: z.array(z.string()).optional(),
          cohortIds: z.array(z.string()).optional(),
          recommenderIds: z
            .array(z.string())
            .optional()
            .describe('Requires the experimental recommender feature'),
          attributes: z.array(z.string()).optional(),
          explainability: z.boolean().optional()
        })
        .optional(),
      preview: z
        .boolean()
        .optional()
        .describe('True provides a limited unbilled preview; false enables a full scope')
    })
  )
  .output(resourceSchema)
  .handleInvocation(async ctx => {
    let body = pickDefined({
      name: ctx.input.name,
      preview: ctx.input.preview,
      population:
        ctx.input.population === undefined
          ? undefined
          : pickDefined({
              cohort_ids: ctx.input.population.cohortIds,
              exclusion_cohort_ids: ctx.input.population.exclusionCohortIds,
              exclusion_address_level_cohort_ids:
                ctx.input.population.exclusionAddressLevelCohortIds
            }),
      payload:
        ctx.input.payload === undefined
          ? undefined
          : pickDefined({
              outcome_ids: ctx.input.payload.outcomeIds,
              persona_set_ids: ctx.input.payload.personaSetIds,
              cohort_ids: ctx.input.payload.cohortIds,
              recommender_ids: ctx.input.payload.recommenderIds,
              attributes: ctx.input.payload.attributes,
              explainability: ctx.input.payload.explainability
            })
    });
    requireChanges(body);
    let resource = await new FaradayClient(ctx.auth).updateScope(ctx.input.scopeId, body);
    return {
      output: resourceOutput(resource),
      message: `Updated scope **${resource.name}**.`
    };
  })
  .build();

export let updateTarget = SlateTool.create(spec, {
  name: 'Update Target',
  key: 'update_target',
  description:
    'Update a deployment name, destination options, representation, filters, limits, or output column selection.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      targetId: z.string().describe('Target UUID from list_targets'),
      name: z.string().optional(),
      connectionId: z.string().nullable().optional(),
      options: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider target options; keys use API snake_case names'),
      representation: z
        .record(z.string(), z.any())
        .optional()
        .describe('Provider representation patch; keys use API snake_case names'),
      filter: z.record(z.string(), z.any()).nullable().optional(),
      limit: z.record(z.string(), z.any()).nullable().optional(),
      humanReadable: z.boolean().optional(),
      customStructure: z
        .array(
          z.object({
            scope_col: z.string(),
            output_col: z.string(),
            aggregation: z.enum(['avg', 'count', 'countif', 'mode', 'ignore']).optional(),
            aggregation_criteria: z.string().optional(),
            is_identity_col: z.boolean().optional()
          })
        )
        .nullable()
        .optional()
        .describe(
          'Provider column mappings in export order; null restores the default structure'
        )
    })
  )
  .output(resourceSchema)
  .handleInvocation(async ctx => {
    let body = pickDefined({
      name: ctx.input.name,
      connection_id: ctx.input.connectionId,
      options: ctx.input.options,
      representation: ctx.input.representation,
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      human_readable: ctx.input.humanReadable,
      custom_structure: ctx.input.customStructure
    });
    requireChanges(body);
    let resource = await new FaradayClient(ctx.auth).updateTarget(ctx.input.targetId, body);
    return {
      output: resourceOutput(resource),
      message: `Updated target **${resource.name}**.`
    };
  })
  .build();

export let deletePersonaSet = SlateTool.create(spec, {
  name: 'Delete Persona Set',
  key: 'delete_persona_set',
  description:
    'Delete a persona set. Check get_dependency_graph before deleting a resource used by other predictions.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({ personaSetId: z.string().describe('Persona set UUID from list_persona_sets') })
  )
  .output(z.object({ deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new FaradayClient(ctx.auth).deletePersonaSet(ctx.input.personaSetId);
    return {
      output: { deleted: true },
      message: `Deleted persona set **${ctx.input.personaSetId}**.`
    };
  })
  .build();

export let deleteScope = SlateTool.create(spec, {
  name: 'Delete Scope',
  key: 'delete_scope',
  description:
    'Delete a prediction pipeline scope. Check get_dependency_graph for dependent deployments first.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ scopeId: z.string().describe('Scope UUID from list_scopes') }))
  .output(z.object({ deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new FaradayClient(ctx.auth).deleteScope(ctx.input.scopeId);
    return { output: { deleted: true }, message: `Deleted scope **${ctx.input.scopeId}**.` };
  })
  .build();

export let deleteTarget = SlateTool.create(spec, {
  name: 'Delete Target',
  key: 'delete_target',
  description: 'Delete a deployment target from the account.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ targetId: z.string().describe('Target UUID from list_targets') }))
  .output(z.object({ deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new FaradayClient(ctx.auth).deleteTarget(ctx.input.targetId);
    return { output: { deleted: true }, message: `Deleted target **${ctx.input.targetId}**.` };
  })
  .build();

export let previewTarget = SlateTool.create(spec, {
  name: 'Preview Target',
  key: 'preview_target',
  description:
    'Start a preview delivery containing the first 1,000 results of a deployment target.',
  tags: { readOnly: false, destructive: false }
})
  .input(z.object({ targetId: z.string().describe('Target UUID from list_targets') }))
  .output(z.object({ targetId: z.string(), statusMessage: z.string() }))
  .handleInvocation(async ctx => {
    let result = await new FaradayClient(ctx.auth).previewTarget(ctx.input.targetId);
    return {
      output: { targetId: result.target_id, statusMessage: result.message },
      message: result.message
    };
  })
  .build();

export let downloadTargetCsv = SlateTool.create(spec, {
  name: 'Download Target CSV',
  key: 'download_target_csv',
  description: 'Prepare the default CSV export of a built deployment target for download.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ targetId: z.string().describe('Target UUID from list_targets') }))
  .output(z.object({ targetId: z.string(), name: z.string(), mimeType: z.string() }))
  .handleInvocation(async ctx => {
    let target = await new FaradayClient(ctx.auth).getTarget(ctx.input.targetId);
    if (target.status !== 'ready') {
      throw createApiServiceError(
        'The target is not ready. Wait for a successful build before requesting its CSV download.'
      );
    }
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.faraday.ai/v1/targets/${encodeURIComponent(ctx.input.targetId)}/download.csv`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      mimeType: 'text/csv'
    });
    return {
      output: { targetId: target.id, name: target.name, mimeType: 'text/csv' },
      message: `Prepared CSV download for **${target.name}**.`
    };
  })
  .build();

export let getOutcomeAnalysis = SlateTool.create(spec, {
  name: 'Get Outcome Analysis',
  key: 'get_outcome_analysis',
  description:
    'Retrieve the model analysis for an outcome, including the provider performance and modeling details.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ outcomeId: z.string().describe('Outcome UUID from list_outcomes') }))
  .output(z.object({ outcomeId: z.string(), analysis: z.record(z.string(), z.any()) }))
  .handleInvocation(async ctx => {
    let analysis = await new FaradayClient(ctx.auth).getOutcomeAnalysis(ctx.input.outcomeId);
    return {
      output: { outcomeId: ctx.input.outcomeId, analysis },
      message: `Retrieved analysis for outcome **${ctx.input.outcomeId}**.`
    };
  })
  .build();
