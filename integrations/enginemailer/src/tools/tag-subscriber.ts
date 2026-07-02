import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let tagSubscriber = SlateTool.create(spec, {
  name: 'Tag Subscriber',
  key: 'tag_subscriber',
  description: `Add one or more subcategory tags to a subscriber for segmentation. Tags allow you to group subscribers for targeted campaigns. Use subcategory names or IDs as they appear in your Enginemailer account.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber to tag'),
      subcategories: z
        .array(z.string())
        .min(1)
        .describe('Subcategory names or IDs to tag the subscriber with')
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

    let result = await client.tagSubscriber(ctx.input.email, ctx.input.subcategories);

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        message: result.Result?.Message ?? result.Result?.ErrorMessage
      },
      message: `Tagged subscriber **${ctx.input.email}** with ${ctx.input.subcategories.length} subcategorie(s).`
    };
  })
  .build();
