import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findSubscriber = SlateTool.create(spec, {
  name: 'Find Subscriber',
  key: 'find_subscriber',
  description: `Look up a subscriber by their email address and retrieve their profile data including custom fields, subcategories, and status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber to look up')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      subscriberData: z.any().optional().describe('Subscriber data returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSubscriber(ctx.input.email);

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        subscriberData: result.Result?.Data
      },
      message:
        result.Result?.Status === 'OK'
          ? `Found subscriber **${ctx.input.email}**.`
          : `Subscriber **${ctx.input.email}** not found.`
    };
  })
  .build();
