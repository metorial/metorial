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
        .describe('Inspection policy ID to apply during scanning'),
      scanLimit: z.number().optional().describe('Maximum number of resources to scan'),
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
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.createAndScheduleScan({
      scheduleType: ctx.input.scheduleType,
      scanType: ctx.input.scanType,
      connectorId: ctx.input.connectorId,
      resourceType: ctx.input.resourceType,
      resourceIds: ctx.input.resourceIds,
      inspectionPolicyId: ctx.input.inspectionPolicyId,
      scanLimit: ctx.input.scanLimit,
      cronExpression: ctx.input.cronExpression,
      name: ctx.input.name
    });

    let data = result?.data ?? result;

    return {
      output: {
        scanId: data?.id ?? data?.scanId,
        status: data?.status,
        scheduleType: data?.scheduleType,
        createdAt: data?.createdAt,
        ...data
      },
      message: `Scan created successfully${data?.id ? ` with ID **${data.id}**` : ''}. Schedule type: **${ctx.input.scheduleType}**.`
    };
  })
  .build();
