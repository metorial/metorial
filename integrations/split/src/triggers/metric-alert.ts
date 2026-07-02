import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let metricAlert = SlateTrigger.create(spec, {
  name: 'Metric Alert',
  key: 'metric_alert',
  description:
    'Triggers when a metric alert fires or experiment results reach statistical significance. Configure the "Metric Alerts" webhook integration in Split UI to point to this trigger\'s URL.'
})
  .input(
    z.object({
      alertType: z.string().describe('Alert type: ALERT_POLICY or SIGNIFICANCE.'),
      firedAt: z.string().describe('ISO 8601 timestamp when the alert fired.'),
      firedAtMs: z.number().describe('Unix epoch timestamp in milliseconds.'),
      integrationId: z.string().optional().describe('ID of the webhook integration.'),
      sourceName: z.string().describe('Name of the feature flag or experiment.'),
      sourceId: z.string().describe('ID of the feature flag or experiment.'),
      sourceType: z.string().describe('FEATURE_FLAG or EXPERIMENT.'),
      sourceUrl: z.string().optional().describe('URL to the source in Split UI.'),
      metricName: z.string().describe('Name of the metric.'),
      metricId: z.string().describe('ID of the metric.'),
      environmentName: z.string().describe('Environment name.'),
      environmentId: z.string().describe('Environment ID.'),
      baselineTreatment: z.string().optional().describe('Baseline treatment name.'),
      comparisonTreatment: z.string().optional().describe('Comparison treatment name.'),
      absoluteImpact: z.number().optional().describe('Absolute impact value.'),
      relativeImpact: z.number().optional().describe('Relative impact percentage.'),
      pValue: z.number().optional().describe('Statistical p-value.'),
      direction: z.string().optional().describe('DESIRED or UNDESIRED.')
    })
  )
  .output(
    z.object({
      alertType: z.string().describe('ALERT_POLICY or SIGNIFICANCE.'),
      firedAt: z.string().describe('When the alert fired.'),
      sourceName: z.string().describe('Feature flag or experiment name.'),
      sourceType: z.string().describe('FEATURE_FLAG or EXPERIMENT.'),
      metricName: z.string().describe('Metric that triggered the alert.'),
      environmentName: z.string().describe('Environment.'),
      baselineTreatment: z.string().optional(),
      comparisonTreatment: z.string().optional(),
      absoluteImpact: z.number().optional(),
      relativeImpact: z.number().optional(),
      pValue: z.number().optional(),
      direction: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            alertType: body.data?.alertType ?? body.type ?? '',
            firedAt: body.firedAt ?? '',
            firedAtMs: body.firedAtMs ?? 0,
            integrationId: body.integrationId,
            sourceName: body.source?.name ?? '',
            sourceId: body.source?.id ?? '',
            sourceType: body.source?.type ?? '',
            sourceUrl: body.source?.url,
            metricName: body.data?.metric?.name ?? '',
            metricId: body.data?.metric?.id ?? '',
            environmentName: body.data?.environment?.name ?? '',
            environmentId: body.data?.environment?.id ?? '',
            baselineTreatment: body.data?.baselineTreatment,
            comparisonTreatment: body.data?.comparisonTreatment,
            absoluteImpact: body.data?.absoluteImpact,
            relativeImpact: body.data?.relativeImpact,
            pValue: body.data?.pValue,
            direction: body.data?.direction
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let alertTypeSlug = ctx.input.alertType.toLowerCase();
      return {
        type: `metric_alert.${alertTypeSlug}`,
        id: `${ctx.input.sourceId}-${ctx.input.metricId}-${ctx.input.firedAtMs}`,
        output: {
          alertType: ctx.input.alertType,
          firedAt: ctx.input.firedAt,
          sourceName: ctx.input.sourceName,
          sourceType: ctx.input.sourceType,
          metricName: ctx.input.metricName,
          environmentName: ctx.input.environmentName,
          baselineTreatment: ctx.input.baselineTreatment,
          comparisonTreatment: ctx.input.comparisonTreatment,
          absoluteImpact: ctx.input.absoluteImpact,
          relativeImpact: ctx.input.relativeImpact,
          pValue: ctx.input.pValue,
          direction: ctx.input.direction
        }
      };
    }
  })
  .build();
