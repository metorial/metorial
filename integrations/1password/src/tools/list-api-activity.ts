import { SlateTool } from 'slates';
import { z } from 'zod';
import { createConnectClient } from '../lib/connect-tool';
import { spec } from '../spec';

export let listApiActivity = SlateTool.create(spec, {
  name: 'List API Activity',
  key: 'list_api_activity',
  description: `List recent API activity recorded by the 1Password Connect server, including action, result, actor, and affected resource metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of activity records to return'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Offset into the activity collection')
    })
  )
  .output(
    z.object({
      activities: z.array(
        z.object({
          requestId: z.string().describe('Unique identifier for the API request'),
          timestamp: z.string().describe('When the request occurred'),
          action: z.string().describe('Action performed by the request'),
          result: z.string().describe('Result of the request'),
          actorId: z.string().optional().describe('Connect server actor ID'),
          accountId: z.string().optional().describe('1Password account ID'),
          userAgent: z.string().optional().describe('User agent for the request'),
          ip: z.string().optional().describe('Source IP for the request'),
          resourceType: z.string().optional().describe('Type of resource accessed'),
          vaultId: z.string().optional().describe('Vault ID associated with the request'),
          itemId: z.string().optional().describe('Item ID associated with the request'),
          itemVersion: z
            .number()
            .optional()
            .describe('Item version associated with the request')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createConnectClient(ctx);

    ctx.progress('Fetching API activity...');
    let activities = await client.getActivity(ctx.input.limit, ctx.input.offset);
    let mapped = activities.map(activity => ({
      requestId: activity.requestID ?? activity.requestId,
      timestamp: activity.timestamp,
      action: activity.action,
      result: activity.result,
      actorId: activity.actor?.id,
      accountId: activity.actor?.account,
      userAgent: activity.actor?.userAgent,
      ip: activity.actor?.ip ?? activity.actor?.requestIp,
      resourceType: activity.resource?.type,
      vaultId: activity.resource?.vault?.id,
      itemId: activity.resource?.item?.id,
      itemVersion: activity.resource?.itemVersion
    }));

    return {
      output: {
        activities: mapped
      },
      message: `Found **${mapped.length}** API activity record(s).`
    };
  })
  .build();
