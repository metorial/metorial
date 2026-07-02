import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let getSource = SlateTool.create(spec, {
  name: 'Get Source',
  key: 'get_source',
  description: `Retrieves detailed information about a specific data source (integration) including its configuration properties, connection status, and report card. Can also check the last connection status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.number().describe('ID of the source to retrieve'),
      includeConnectionCheck: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch the last connection check result')
    })
  )
  .output(
    z.object({
      sourceId: z.number().describe('Unique identifier for the source'),
      type: z.string().describe('Source type'),
      name: z.string().nullable().describe('Display name'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Configuration properties'),
      createdAt: z.string().nullable().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().nullable().describe('ISO 8601 last updated timestamp'),
      pausedAt: z.string().nullable().describe('ISO 8601 timestamp if paused'),
      reportCard: z.any().optional().describe('Configuration status report card'),
      lastConnectionCheck: z
        .any()
        .optional()
        .describe('Last connection check result, if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let source = await client.getSource(ctx.input.sourceId);
    let lastConnectionCheck: any;

    if (ctx.input.includeConnectionCheck) {
      try {
        lastConnectionCheck = await client.getLastConnectionCheck(ctx.input.sourceId);
      } catch (_e) {
        ctx.warn('Could not fetch last connection check');
      }
    }

    return {
      output: {
        sourceId: source.id,
        type: source.type,
        name: source.display_name || source.name || null,
        properties: source.properties,
        createdAt: source.created_at || null,
        updatedAt: source.updated_at || null,
        pausedAt: source.paused_at || null,
        reportCard: source.report_card,
        lastConnectionCheck
      },
      message: `Retrieved source **${source.display_name || source.name || source.id}** (type: ${source.type}).`
    };
  })
  .build();
