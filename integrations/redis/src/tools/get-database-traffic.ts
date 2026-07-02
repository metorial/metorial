import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedisCloudClient } from '../lib/client';
import { spec } from '../spec';
import { subscriptionTypeSchema } from './common';

export let getDatabaseTraffic = SlateTool.create(spec, {
  name: 'Get Database Traffic',
  key: 'get_database_traffic',
  description: `Retrieve Redis Cloud database traffic state, including whether traffic can be resumed. Supports Pro and Essentials databases.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriptionId: z.number().describe('Subscription ID containing the database'),
      databaseId: z.number().describe('Database ID to check'),
      type: subscriptionTypeSchema
    })
  )
  .output(
    z.object({
      databaseId: z.number().optional().describe('Database ID'),
      trafficStatus: z.string().optional().describe('Current traffic status'),
      canResume: z.boolean().optional().describe('Whether traffic can be resumed'),
      resumeInProgress: z.boolean().optional().describe('Whether resume is in progress'),
      stopReason: z.string().optional().describe('Reason traffic is stopped'),
      resumeEligibleAt: z.string().optional().describe('Time when traffic can be resumed'),
      raw: z.any().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RedisCloudClient(ctx.auth);
    let data =
      ctx.input.type === 'essentials'
        ? await client.getEssentialsDatabaseTraffic(
            ctx.input.subscriptionId,
            ctx.input.databaseId
          )
        : await client.getDatabaseTraffic(ctx.input.subscriptionId, ctx.input.databaseId);

    return {
      output: {
        databaseId: data.bdbId || data.databaseId,
        trafficStatus: data.trafficStatus,
        canResume: data.canResume,
        resumeInProgress: data.resumeInProgress,
        stopReason: data.stopReason,
        resumeEligibleAt: data.resumeEligibleAt,
        raw: data
      },
      message: `Traffic status for database **${ctx.input.databaseId}** is **${data.trafficStatus || 'unknown'}**.`
    };
  })
  .build();
