import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPost = SlateTool.create(spec, {
  name: 'Get Post',
  key: 'get_post',
  description: `Retrieve a single-image post (standard post) from the directory by post ID or by querying a specific property.
Covers content types like articles, videos, jobs, events, coupons, audios, and discussions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().optional().describe('The post ID to look up directly.'),
      property: z
        .string()
        .optional()
        .describe('The column/field name to search by. Used when postId is not provided.'),
      propertyValue: z
        .string()
        .optional()
        .describe('The value to match for the given property.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      post: z.any().describe('The post record(s) returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result: any;
    if (ctx.input.postId) {
      result = await client.getPost(ctx.input.postId);
    } else if (ctx.input.property && ctx.input.propertyValue) {
      result = await client.getPostByProperty(ctx.input.property, ctx.input.propertyValue);
    } else {
      throw new Error('Either postId or both property and propertyValue must be provided.');
    }

    return {
      output: {
        status: result.status,
        post: result.message
      },
      message: `Retrieved post data successfully.`
    };
  })
  .build();
