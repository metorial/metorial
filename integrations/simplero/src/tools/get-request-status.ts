import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let getRequestStatus = SlateTool.create(spec, {
  name: 'Get Request Status',
  key: 'get_request_status',
  description:
    'Check the progress and results of an asynchronous Simplero request, such as a bulk list subscription.',
  instructions: [
    'Pass the bulkToken returned by manage_list_subscription with action "bulk_subscribe" as requestToken.',
    'A pending or running request has not completed. A failure status reports that the background operation failed; inspect the returned result.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      requestToken: z
        .string()
        .min(1)
        .describe('Tracking token returned by an asynchronous request')
    })
  )
  .output(
    z.object({
      request: z
        .record(z.string(), z.unknown())
        .describe('Request token, action, status, timestamps, and result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });
    let request = await client.getRequestStatus(ctx.input.requestToken);
    return {
      output: { request },
      message: `Request **${ctx.input.requestToken}** has status **${request.status}**.`
    };
  })
  .build();
