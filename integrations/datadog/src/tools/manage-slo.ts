import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let thresholdSchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d']).describe('Rolling time window'),
  target: z.number().describe('Target percentage (e.g. 99.9)'),
  warning: z.number().optional().describe('Warning threshold percentage')
});

export let manageSlo = SlateTool.create(spec, {
  name: 'Manage SLO',
  key: 'manage_slo',
  description: `Create or update a Datadog Service Level Objective. SLOs track the reliability of your services using monitor-based or metric-based measurements.`,
  instructions: [
    'To create a new SLO, omit sloId and provide name, type, and thresholds.',
    'To update an existing SLO, provide the sloId with the fields to change.',
    'SLO types: "monitor" (based on monitor groups), "metric" (based on metric queries).',
    'For "monitor" type, provide monitorIds. For "metric" type, provide numerator and denominator queries.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sloId: z.string().optional().describe('SLO ID to update. Omit to create a new SLO.'),
      name: z.string().optional().describe('SLO name (required for creation)'),
      type: z
        .enum(['monitor', 'metric'])
        .optional()
        .describe('SLO type (required for creation)'),
      description: z.string().optional().describe('SLO description'),
      tags: z.array(z.string()).optional().describe('Tags for the SLO'),
      thresholds: z
        .array(thresholdSchema)
        .optional()
        .describe('SLO target thresholds (required for creation)'),
      monitorIds: z
        .array(z.number())
        .optional()
        .describe('Monitor IDs for monitor-based SLOs'),
      numeratorQuery: z.string().optional().describe('Numerator query for metric-based SLOs'),
      denominatorQuery: z
        .string()
        .optional()
        .describe('Denominator query for metric-based SLOs'),
      groups: z.array(z.string()).optional().describe('Groups for the SLO')
    })
  )
  .output(
    z.object({
      sloId: z.string().describe('SLO ID'),
      name: z.string().describe('SLO name'),
      type: z.string().describe('SLO type'),
      description: z.string().optional().describe('SLO description'),
      tags: z.array(z.string()).optional().describe('SLO tags'),
      thresholds: z
        .array(
          z.object({
            timeframe: z.string(),
            target: z.number(),
            targetDisplay: z.string().optional(),
            warning: z.number().optional()
          })
        )
        .optional()
        .describe('SLO thresholds'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      modifiedAt: z.number().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { sloId, numeratorQuery, denominatorQuery, ...data } = ctx.input;
    let result: any;
    let isCreating = !sloId;

    let query =
      numeratorQuery && denominatorQuery
        ? { numerator: numeratorQuery, denominator: denominatorQuery }
        : undefined;

    if (sloId) {
      result = await client.updateSLO(sloId, {
        name: data.name,
        description: data.description,
        tags: data.tags,
        thresholds: data.thresholds,
        monitorIds: data.monitorIds,
        query,
        groups: data.groups
      });
    } else {
      if (!data.name || !data.type || !data.thresholds) {
        throw new Error('name, type, and thresholds are required when creating a new SLO.');
      }
      result = await client.createSLO({
        name: data.name,
        type: data.type,
        description: data.description,
        tags: data.tags,
        thresholds: data.thresholds,
        monitorIds: data.monitorIds,
        query,
        groups: data.groups
      });
    }

    let slo = result.data || result;

    let thresholds = (slo.thresholds || []).map((t: any) => ({
      timeframe: t.timeframe,
      target: t.target,
      targetDisplay: t.target_display,
      warning: t.warning
    }));

    return {
      output: {
        sloId: slo.id,
        name: slo.name,
        type: slo.type,
        description: slo.description,
        tags: slo.tags,
        thresholds,
        createdAt: slo.created_at,
        modifiedAt: slo.modified_at
      },
      message: isCreating
        ? `Created SLO **${slo.name}** (ID: ${slo.id})`
        : `Updated SLO **${slo.name}** (ID: ${slo.id})`
    };
  })
  .build();
