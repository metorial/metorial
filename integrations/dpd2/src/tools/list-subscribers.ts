import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listSubscribers = SlateTool.create(spec, {
  name: 'List Subscribers',
  key: 'list_subscribers',
  description: `Retrieve subscribers for a specific subscription storefront. Optionally filter by subscriber username (email). Subscribers are users with recurring subscription access to DPD-hosted content areas.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('1-based page; omitted means page 1. Continue until endOfResults is true.'),
      storefrontId: z
        .number()
        .describe(
          'The storefront ID to list subscribers for (must be a subscription-type storefront)'
        ),
      username: z.string().optional().describe('Filter by subscriber email/username')
    })
  )
  .output(
    z.object({
      subscribers: z.array(
        z.object({
          subscriberId: z.number().describe('Unique subscriber ID'),
          username: z.string().optional().describe('Subscriber email/username when supplied')
        })
      ),
      ...pageSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listSubscribers(
      ctx.input.storefrontId,
      ctx.input.username,
      ctx.input.page
    );

    return {
      output: {
        subscribers: result.items,
        page: result.page,
        nextPage: result.nextPage,
        endOfResults: result.endOfResults
      },
      message: `Retrieved ${result.items.length} subscribers on page ${result.page}${result.endOfResults ? '; end of results confirmed' : ''}.`
    };
  })
  .build();
