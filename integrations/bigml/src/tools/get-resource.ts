import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, statusLabel } from '../lib/helpers';
import { spec } from '../spec';

export let getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description: `Retrieve detailed information about a specific BigML resource by its ID. Returns the full resource object including status, fields, configuration, and results.
Useful for checking the status of asynchronous operations (source creation, model training, evaluations, etc.) and retrieving model metrics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      resourceId: z
        .string()
        .describe(
          'Full resource ID (e.g., "source/abc123", "model/abc123", "evaluation/abc123")'
        )
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('Resource ID'),
      name: z.string().optional().describe('Resource name'),
      description: z.string().optional().describe('Resource description'),
      statusCode: z.number().optional().describe('Status code (5 = finished, -1 = faulty)'),
      statusMessage: z.string().optional().describe('Status message'),
      statusLabel: z.string().optional().describe('Human-readable status label'),
      created: z.string().optional().describe('Creation timestamp'),
      updated: z.string().optional().describe('Last updated timestamp'),
      tags: z.array(z.string()).optional().describe('Resource tags'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Field definitions for datasets and models'),
      resourceData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full resource-specific data')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getResource(ctx.input.resourceId);

    let sCode = result.status?.code;
    let sMessage = result.status?.message;
    let sLabel = sCode !== undefined ? statusLabel(sCode) : undefined;

    // Extract key fields from the result, excluding very large or internal fields
    let resourceData: Record<string, any> = {};
    let excludeKeys = new Set([
      'resource',
      'code',
      'status',
      'created',
      'updated',
      'name',
      'description',
      'tags',
      'fields'
    ]);
    for (let [key, value] of Object.entries(result)) {
      if (!excludeKeys.has(key) && typeof value !== 'function') {
        resourceData[key] = value;
      }
    }

    return {
      output: {
        resourceId: result.resource,
        name: result.name,
        description: result.description,
        statusCode: sCode,
        statusMessage: sMessage,
        statusLabel: sLabel,
        created: result.created,
        updated: result.updated,
        tags: result.tags,
        fields: result.fields,
        resourceData
      },
      message: `Resource **${result.resource}**${result.name ? ` ("${result.name}")` : ''} — status: **${sLabel ?? 'unknown'}** (${sMessage ?? 'no message'}).`
    };
  })
  .build();
