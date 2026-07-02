import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';
import { subscriptionTypeSchema } from './common';

let slowLogEntrySchema = z.object({
  entryId: z.number().optional().describe('Slow log entry ID'),
  startTime: z.string().optional().describe('Command start time'),
  duration: z.number().optional().describe('Command duration in microseconds'),
  arguments: z.string().optional().describe('Command arguments')
});

export let getDatabaseSlowLog = SlateTool.create(spec, {
  name: 'Get Database Slow Log',
  key: 'get_database_slow_log',
  description: `Retrieve Redis slow log entries for a Redis Cloud database. Supports Pro and Essentials databases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID containing the database'),
      databaseId: z.number().describe('Database ID to inspect'),
      type: subscriptionTypeSchema,
      regionName: z
        .string()
        .optional()
        .describe('Region name for Pro Active-Active database slow log')
    })
  )
  .output(
    z.object({
      entries: z.array(slowLogEntrySchema).describe('Slow log entries'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data =
      ctx.input.type === 'essentials'
        ? await client.getEssentialsDatabaseSlowLog(
            ctx.input.subscriptionId,
            ctx.input.databaseId
          )
        : await client.getDatabaseSlowLog(ctx.input.subscriptionId, ctx.input.databaseId, {
            regionName: ctx.input.regionName
          });

    let rawEntries = data?.entries || data || [];
    if (!Array.isArray(rawEntries)) rawEntries = [];
    let entries = rawEntries.map((entry: any) => ({
      entryId: entry.id,
      startTime: entry.startTime,
      duration: entry.duration,
      arguments: entry.arguments
    }));

    return {
      output: { entries, raw: data },
      message: `Retrieved **${entries.length}** slow log entr${entries.length === 1 ? 'y' : 'ies'} for database **${ctx.input.databaseId}**.`
    };
  })
  .build();
