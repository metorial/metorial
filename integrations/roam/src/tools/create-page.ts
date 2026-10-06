import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let createPage = SlateTool.create(spec, {
  name: 'Create Page',
  key: 'create_page',
  description: `Create a new page in the Roam Research graph. Pages are identified by their title and can optionally be assigned a specific UID.

After creation, blocks can be added to the page using the Create Block tool.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the new page'),
      pageUid: z
        .string()
        .optional()
        .describe(
          'Optional custom UID for the page. If not provided, Roam will generate one automatically.'
        )
    })
  )
  .output(
    z.object({
      pageUid: z.string().describe('Exact target UID for independent reads and recovery'),
      verified: z
        .boolean()
        .describe('Whether the requested outcome was confirmed by an exact read'),
      success: z.boolean().describe('Whether the page was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let result = await client.createPage(ctx.input.title, ctx.input.pageUid);

    return {
      output: {
        success: result.success,
        pageUid: result.targetUid,
        verified: result.verified
      },
      message: 'Created the page and confirmed its exact UID and title.'
    };
  })
  .build();
