import { SlateTool } from 'slates';
import { z } from 'zod';
import { NerdGraphClient } from '../lib/client';
import { spec } from '../spec';

let thresholdSchema = z.object({
  threshold: z.number().describe('Threshold value'),
  thresholdDuration: z
    .number()
    .describe('Duration in seconds the condition must be true before opening a violation'),
  operator: z
    .enum(['ABOVE', 'BELOW', 'EQUALS', 'ABOVE_OR_EQUALS', 'BELOW_OR_EQUALS'])
    .describe('Comparison operator'),
  thresholdOccurrences: z
    .enum(['ALL', 'AT_LEAST_ONCE'])
    .describe('How many data points must violate the threshold')
});

let conditionOutputSchema = z.object({
  conditionId: z.string().describe('Alert condition ID'),
  name: z.string().optional().describe('Condition name'),
  enabled: z.boolean().optional().describe('Whether the condition is enabled'),
  nrql: z.string().optional().describe('NRQL query for the condition'),
  policyId: z.string().optional().describe('Parent alert policy ID'),
  description: z.string().optional().describe('Condition description')
});

export let manageAlertCondition = SlateTool.create(spec, {
  name: 'Manage Alert Condition',
  key: 'manage_alert_condition',
  description: `Create, update, or delete NRQL-based alert conditions. Alert conditions define thresholds that trigger incidents.
Supports both **static** (fixed threshold) and **baseline** (anomaly detection) condition types.`,
  instructions: [
    'To create: provide `action: "create"`, a `policyId`, `name`, `nrql` query, and at least one threshold (`critical` or `warning`).',
    'To update: provide `action: "update"`, the `conditionId`, and the fields to change.',
    'To delete: provide `action: "delete"` and the `conditionId`.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      conditionId: z
        .string()
        .optional()
        .describe('Alert condition ID (required for update/delete)'),
      policyId: z
        .string()
        .optional()
        .describe('Alert policy ID to attach the condition to (required for create)'),
      name: z.string().optional().describe('Condition name'),
      nrql: z
        .string()
        .optional()
        .describe(
          'NRQL query for the condition, e.g. "SELECT count(*) FROM Transaction WHERE error IS true"'
        ),
      enabled: z.boolean().optional().describe('Whether the condition is enabled'),
      conditionType: z
        .enum(['STATIC', 'BASELINE'])
        .optional()
        .default('STATIC')
        .describe('Condition type: STATIC (fixed threshold) or BASELINE (anomaly detection)'),
      critical: thresholdSchema.optional().describe('Critical threshold settings'),
      warning: thresholdSchema.optional().describe('Warning threshold settings'),
      description: z.string().optional().describe('Description for the alert condition'),
      signal: z
        .object({
          aggregationDelay: z.number().optional().describe('Aggregation delay in seconds'),
          aggregationMethod: z
            .enum(['EVENT_FLOW', 'EVENT_TIMER', 'CADENCE'])
            .optional()
            .describe('Aggregation method'),
          aggregationWindow: z.number().optional().describe('Aggregation window in seconds'),
          fillOption: z
            .enum(['NONE', 'LAST_VALUE', 'STATIC'])
            .optional()
            .describe('Gap filling option'),
          fillValue: z
            .number()
            .optional()
            .describe('Static fill value (when fillOption is STATIC)')
        })
        .optional()
        .describe('Signal evaluation settings'),
      expiration: z
        .object({
          closeViolationsOnExpiration: z
            .boolean()
            .optional()
            .describe('Auto-close violations when signal expires'),
          expirationDuration: z
            .number()
            .optional()
            .describe('Seconds after which the signal is considered expired'),
          openViolationOnExpiration: z
            .boolean()
            .optional()
            .describe('Open a violation when the signal expires')
        })
        .optional()
        .describe('Signal expiration settings')
    })
  )
  .output(conditionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NerdGraphClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      accountId: ctx.config.accountId
    });

    let { action } = ctx.input;

    if (action === 'delete') {
      if (!ctx.input.conditionId) throw new Error('conditionId is required for delete action');
      ctx.progress('Deleting alert condition...');
      await client.deleteAlertCondition(ctx.input.conditionId);
      return {
        output: { conditionId: ctx.input.conditionId },
        message: `Alert condition **${ctx.input.conditionId}** deleted successfully.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.policyId) throw new Error('policyId is required for create action');
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.nrql) throw new Error('nrql is required for create action');

      ctx.progress('Creating alert condition...');
      let result = await client.createNrqlAlertCondition(ctx.input.policyId, {
        name: ctx.input.name,
        nrql: ctx.input.nrql,
        enabled: ctx.input.enabled,
        type: ctx.input.conditionType || 'STATIC',
        critical: ctx.input.critical,
        warning: ctx.input.warning,
        signal: ctx.input.signal,
        expiration: ctx.input.expiration,
        description: ctx.input.description
      });

      return {
        output: {
          conditionId: result?.id?.toString(),
          name: result?.name,
          enabled: result?.enabled,
          nrql: result?.nrql?.query,
          policyId: result?.policyId?.toString(),
          description: result?.description
        },
        message: `Alert condition **${result?.name}** created successfully with ID **${result?.id}**.`
      };
    }

    // update
    if (!ctx.input.conditionId) throw new Error('conditionId is required for update action');

    ctx.progress('Updating alert condition...');
    let result = await client.updateNrqlAlertCondition(ctx.input.conditionId, {
      name: ctx.input.name,
      nrql: ctx.input.nrql,
      enabled: ctx.input.enabled,
      type: ctx.input.conditionType || 'STATIC',
      critical: ctx.input.critical,
      warning: ctx.input.warning,
      description: ctx.input.description
    });

    return {
      output: {
        conditionId: result?.id?.toString(),
        name: result?.name,
        enabled: result?.enabled,
        nrql: result?.nrql?.query,
        policyId: result?.policyId?.toString(),
        description: result?.description
      },
      message: `Alert condition **${result?.name}** (${result?.id}) updated successfully.`
    };
  })
  .build();
