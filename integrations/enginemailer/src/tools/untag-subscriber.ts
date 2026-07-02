import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let untagSubscriber = SlateTool.create(spec, {
  name: 'Untag Subscriber',
  key: 'untag_subscriber',
  description: `Remove one or more subcategory tags from a subscriber. The subscriber will no longer be included in campaigns targeting these subcategories.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber to untag'),
      subcategories: z
        .array(z.string())
        .min(1)
        .describe('Subcategory names or IDs to remove from the subscriber')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      message: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.untagSubscriber(ctx.input.email, ctx.input.subcategories);

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        message: result.Result?.Message ?? result.Result?.ErrorMessage
      },
      message: `Removed ${ctx.input.subcategories.length} subcategorie(s) from subscriber **${ctx.input.email}**.`
    };
  })
  .build();
