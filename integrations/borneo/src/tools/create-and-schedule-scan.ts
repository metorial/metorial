import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAndScheduleScan = SlateTool.create(spec, {
  name: 'Create & Schedule Scan',
  key: 'create_and_schedule_scan',
  description: `Create and schedule a sensitive data scan across cloud resources. Supports one-time and recurring scans with configurable scan types (full or sample), resource selection, and inspection policies.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      scheduleType: z
        .enum(['one-time', 'recurring'])
        .describe('Whether this is a one-time or recurring scan'),
      scanType: z
        .enum(['full', 'sample'])
        .optional()
        .describe('Full scan or sample-based scan'),
      connectorId: z.string().optional().describe('Cloud connector ID to scan'),
      resourceType: z
        .string()
        .optional()
        .describe('Type of resource to scan (e.g. database, storage bucket)'),
      resourceIds: z.array(z.string()).optional().describe('Specific resource IDs to scan'),
      inspectionPolicyId: z
        .string()
        .optional()
        .describe(
          'Legacy field unsupported by the provider API. Use inspectionPolicy instead.'
        ),
      inspectionPolicy: z
        .object({
          collectTokens: z.boolean().optional(),
          maskDetails: z.boolean().optional(),
          infotypes: z.array(z.string()).optional(),
          compliance: z.array(z.string()).optional()
        })
        .optional()
        .describe('Sensitive-data inspection policy options.'),
      scanLimits: z
        .object({
          samplePercentage: z.number().optional(),
          maxCumulativeDataSizeMb: z.number().optional(),
          itemsPerBatch: z.number().optional(),
          sampleDurationMinutes: z.number().optional()
        })
        .optional()
        .describe('Data-volume and sampling limits; no resource-count limit is supported.'),
      scanLimit: z
        .number()
        .optional()
        .describe(
          'Legacy resource-count limit unsupported by the provider API. Use scanLimits instead.'
        ),
      cronExpression: z.string().optional().describe('Cron expression for recurring scans'),
      name: z.string().optional().describe('Name for the scan')
    })
  )
  .output(
    z
      .object({
        scanId: z.string().optional().describe('ID of the created scan'),
        status: z.string().optional().describe('Current status of the scan'),
        scheduleType: z.string().optional().describe('Schedule type of the scan'),
        createdAt: z.string().optional().describe('Timestamp when the scan was created')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let result = await client.createAndScheduleScan({
      scheduleType: ctx.input.scheduleType,
      scanType: ctx.input.scanType,
      connectorId: ctx.input.connectorId,
      resourceType: ctx.input.resourceType,
      resourceIds: ctx.input.resourceIds,
      inspectionPolicyId: ctx.input.inspectionPolicyId,
      inspectionPolicy: ctx.input.inspectionPolicy,
      scanLimits: ctx.input.scanLimits,
      scanLimit: ctx.input.scanLimit,
      cronExpression: ctx.input.cronExpression,
      name: ctx.input.name
    });

    let data = result;

    return {
      output: {
        scanId: data.scanId,
        status: data?.status,
        scheduleType: data?.scheduleType,
        createdAt: data?.createdAt,
        ...data
      },
      message: `Scan created successfully${data?.id ? ` with ID **${data.id}**` : ''}. Schedule type: **${ctx.input.scheduleType}**.`
    };
  })
  .build();
