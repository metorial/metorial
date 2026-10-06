import { SlateTool } from 'slates';
import { z } from 'zod';
import { resolveRegion, StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

export let createSource = SlateTool.create(spec, {
  name: 'Create Source',
  key: 'create_source',
  description: `Creates a new data source (integration) in Stitch. After creation, the source may require additional configuration steps (OAuth, field selection) before it becomes fully configured and starts replicating data.`,
  instructions: [
    'Use "list_source_types" tool first to find valid source type identifiers and required properties.',
    'Use the exact identifier returned by list_source_types; examples include platform.hubspot, postgres and import_api.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      type: z
        .string()
        .describe('Source type identifier (e.g., "platform.hubspot", "postgres")'),
      displayName: z.string().describe('Display name for the source'),
      properties: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Connection properties specific to the source type')
    })
  )
  .output(
    z.object({
      sourceId: z.number().describe('ID of the newly created source'),
      type: z.string().describe('Source type'),
      name: z.string().nullable().describe('Display name'),
      reportCard: z.unknown().optional().describe('Configuration status showing next steps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: resolveRegion(ctx.auth.region, ctx.config),
      clientId: ctx.auth.clientId ?? ctx.config.clientId
    });

    let source = await client.createSource({
      type: ctx.input.type,
      display_name: ctx.input.displayName,
      properties: ctx.input.properties ?? {}
    });

    return {
      output: {
        sourceId: source.id,
        type: source.type,
        name: source.display_name || source.name || null,
        reportCard: source.report_card
      },
      message: `Created source **${ctx.input.displayName}** (ID: ${source.id}, type: ${ctx.input.type}).`
    };
  })
  .build();
