import { SlateTool } from 'slates';
import { z } from 'zod';
import { HeapClient } from '../lib/client';
import { spec } from '../spec';

export let getDeletionStatus = SlateTool.create(spec, {
  name: 'Get Deletion Status',
  key: 'get_deletion_status',
  description:
    'Check whether a user deletion request submitted with delete_user is pending or complete.',
  instructions: [
    'Pass the requestId returned by delete_user. Requires the same Main Production App ID and API Key.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      requestId: z.string().describe('Deletion request ID returned by delete_user.')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Deletion request ID returned by Heap.'),
      status: z
        .string()
        .describe('Provider deletion request status, such as pending or complete.'),
      deleted: z
        .boolean()
        .describe('Whether Heap reports that the deletion request is complete.'),
      requestLocation: z.string().optional().describe('Provider status URL, when returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HeapClient({
      appId: ctx.auth.appId,
      apiKey: ctx.auth.token,
      datacenter: ctx.config.datacenter
    });
    let result = await client.getDeletionStatus(ctx.input.requestId);
    return {
      output: result,
      message: `Heap deletion request **${result.requestId}**: **${result.status}**.`
    };
  })
  .build();
