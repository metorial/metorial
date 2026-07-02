import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSubscriberStatus = SlateTool.create(spec, {
  name: 'Update Subscriber Status',
  key: 'update_subscriber_status',
  description: `Change the status of an existing subscriber. Can set a subscriber to **active**, **unsubscribed**, or **deleted**. Marking a subscriber as deleted prevents any future emails from being sent to them.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber to update'),
      status: z
        .enum(['active', 'unsubscribed', 'deleted'])
        .describe('New status for the subscriber')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address of the updated subscriber'),
      status: z.string().describe('Updated status of the subscriber')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateSubscriberStatus({
      email: ctx.input.email,
      status: ctx.input.status
    });

    return {
      output: result,
      message: `Updated subscriber **${result.email}** status to **${result.status}**.`
    };
  })
  .build();
