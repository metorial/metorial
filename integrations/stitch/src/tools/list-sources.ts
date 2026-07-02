import { SlateTool } from 'slates';
import { z } from 'zod';
import { StitchConnectClient } from '../lib/client';
import { spec } from '../spec';

let sourceSchema = z.object({
  sourceId: z.number().describe('Unique identifier for the source'),
  type: z.string().describe('Source type (e.g., platform.hubspot, platform.postgres)'),
  name: z.string().nullable().describe('Display name of the source'),
  createdAt: z.string().nullable().describe('ISO 8601 timestamp when the source was created'),
  updatedAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp when the source was last updated'),
  pausedAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp if the source is paused, null otherwise'),
  systemPausedAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp if system-paused, null otherwise'),
  stale: z.boolean().nullable().describe('Whether the source data is stale'),
  reportCard: z
    .any()
    .optional()
    .describe('Configuration status and report card for the source')
});

export let listSources = SlateTool.create(spec, {
  name: 'List Sources',
  key: 'list_sources',
  description: `Lists all configured data sources (integrations) in the Stitch account. Returns source metadata including type, name, status, and configuration details. Use this to get an overview of all data pipelines or find a specific source ID.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sources: z.array(sourceSchema).describe('List of all configured sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StitchConnectClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      clientId: ctx.config.clientId
    });

    let rawSources = await client.listSources();

    let sources = rawSources.map((s: any) => ({
      sourceId: s.id,
      type: s.type,
      name: s.display_name || s.name || null,
      createdAt: s.created_at || null,
      updatedAt: s.updated_at || null,
      pausedAt: s.paused_at || null,
      systemPausedAt: s.system_paused_at || null,
      stale: s.stale ?? null,
      reportCard: s.report_card
    }));

    return {
      output: { sources },
      message: `Found **${sources.length}** source(s) in the account.`
    };
  })
  .build();
