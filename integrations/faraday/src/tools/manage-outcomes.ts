import { SlateTool } from 'slates';
import { z } from 'zod';
import { FaradayClient } from '../lib/client';
import { spec } from '../spec';

let outcomeSchema = z.object({
  outcomeId: z.string().describe('Unique identifier of the outcome'),
  name: z.string().describe('Human-readable name of the outcome'),
  status: z
    .string()
    .optional()
    .describe('Current status: new, starting, running, ready, or error'),
  attainmentCohortId: z
    .string()
    .optional()
    .describe('Cohort of people who attained the desired outcome'),
  eligibleCohortId: z.string().optional().describe('Cohort of eligible people'),
  attritionCohortId: z
    .string()
    .optional()
    .describe('Cohort of people who failed to attain the outcome'),
  rocAuc: z.number().optional().describe('ROC AUC model performance metric (0-1)'),
  liftValue: z.number().optional().describe('Lift value indicating model performance'),
  reportUrl: z.string().optional().describe('URL to the HTML model analysis report'),
  createdAt: z.string().optional().describe('Timestamp when the outcome was created'),
  updatedAt: z.string().optional().describe('Timestamp when the outcome was last updated')
});

export let listOutcomes = SlateTool.create(spec, {
  name: 'List Outcomes',
  key: 'list_outcomes',
  description: `Retrieve all prediction outcomes in your Faraday account. Outcomes represent predictive objectives such as likelihood to convert, churn, or repurchase.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      outcomes: z.array(outcomeSchema).describe('List of all outcomes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let outcomes = await client.listOutcomes();

    let mapped = outcomes.map((o: any) => ({
      outcomeId: o.id,
      name: o.name,
      status: o.status,
      attainmentCohortId: o.attainment_cohort_id,
      eligibleCohortId: o.eligible_cohort_id,
      attritionCohortId: o.attrition_cohort_id,
      rocAuc: o.roc_auc,
      liftValue: o.lift_value,
      reportUrl: o.report_url,
      createdAt: o.created_at,
      updatedAt: o.updated_at
    }));

    return {
      output: { outcomes: mapped },
      message: `Found **${mapped.length}** outcome(s).`
    };
  })
  .build();

export let getOutcome = SlateTool.create(spec, {
  name: 'Get Outcome',
  key: 'get_outcome',
  description: `Retrieve detailed information about a specific outcome, including model performance metrics (ROC AUC, lift) and report URL.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      outcomeId: z.string().describe('UUID of the outcome to retrieve')
    })
  )
  .output(outcomeSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    let o = await client.getOutcome(ctx.input.outcomeId);

    return {
      output: {
        outcomeId: o.id,
        name: o.name,
        status: o.status,
        attainmentCohortId: o.attainment_cohort_id,
        eligibleCohortId: o.eligible_cohort_id,
        attritionCohortId: o.attrition_cohort_id,
        rocAuc: o.roc_auc,
        liftValue: o.lift_value,
        reportUrl: o.report_url,
        createdAt: o.created_at,
        updatedAt: o.updated_at
      },
      message: `Outcome **${o.name}** is **${o.status}**${o.roc_auc ? ` with ROC AUC of ${o.roc_auc}` : ''}.`
    };
  })
  .build();

export let createOutcome = SlateTool.create(spec, {
  name: 'Create Outcome',
  key: 'create_outcome',
  description: `Create a new predictive outcome. Define which cohort represents attainment (e.g., converted customers) and optionally an attrition cohort and eligible population. Faraday trains ML models using your data and its Identity Graph.`,
  instructions: [
    'You must specify an attainment cohort that represents the people who achieved the desired outcome.',
    'Optionally specify an attrition cohort as counterexamples and an eligible cohort to limit the population.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Unique human-readable name for the outcome'),
      attainmentCohortId: z
        .string()
        .describe('UUID of the cohort of people who attained the desired outcome'),
      eligibleCohortId: z
        .string()
        .optional()
        .describe('UUID of the cohort of eligible people (defaults to US population)'),
      attritionCohortId: z
        .string()
        .optional()
        .describe('UUID of the cohort of people who failed to attain the outcome'),
      biasMitigation: z
        .object({
          age: z
            .enum(['none', 'equality', 'equity'])
            .optional()
            .describe('Bias mitigation strategy for age'),
          gender: z
            .enum(['none', 'equality', 'equity'])
            .optional()
            .describe('Bias mitigation strategy for gender')
        })
        .optional()
        .describe('Configure bias mitigation on sensitive dimensions'),
      predictionMode: z
        .enum(['auto', 'static'])
        .optional()
        .describe('Prediction mode: auto for dynamic modeling, static for one-time'),
      featureBlocklist: z
        .array(z.string())
        .optional()
        .describe('Fields to exclude from modeling'),
      preview: z
        .boolean()
        .optional()
        .describe('Set to true to defer building until preview is disabled')
    })
  )
  .output(outcomeSchema)
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name,
      attainment_cohort_id: ctx.input.attainmentCohortId
    };
    if (ctx.input.eligibleCohortId) body.eligible_cohort_id = ctx.input.eligibleCohortId;
    if (ctx.input.attritionCohortId) body.attrition_cohort_id = ctx.input.attritionCohortId;
    if (ctx.input.biasMitigation) body.bias_mitigation = ctx.input.biasMitigation;
    if (ctx.input.predictionMode) body.prediction_mode = ctx.input.predictionMode;
    if (ctx.input.featureBlocklist) body.feature_blocklist = ctx.input.featureBlocklist;
    if (ctx.input.preview !== undefined) body.preview = ctx.input.preview;

    let o = await client.createOutcome(body);

    return {
      output: {
        outcomeId: o.id,
        name: o.name,
        status: o.status,
        attainmentCohortId: o.attainment_cohort_id,
        eligibleCohortId: o.eligible_cohort_id,
        attritionCohortId: o.attrition_cohort_id,
        rocAuc: o.roc_auc,
        liftValue: o.lift_value,
        reportUrl: o.report_url,
        createdAt: o.created_at,
        updatedAt: o.updated_at
      },
      message: `Created outcome **${o.name}** (${o.id}). Status: **${o.status}**.`
    };
  })
  .build();

export let deleteOutcome = SlateTool.create(spec, {
  name: 'Delete Outcome',
  key: 'delete_outcome',
  description: `Permanently delete a prediction outcome. This cannot be undone and may affect dependent scopes.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      outcomeId: z.string().describe('UUID of the outcome to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the outcome was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FaradayClient({ token: ctx.auth.token });
    await client.deleteOutcome(ctx.input.outcomeId);

    return {
      output: { deleted: true },
      message: `Deleted outcome **${ctx.input.outcomeId}**.`
    };
  })
  .build();
