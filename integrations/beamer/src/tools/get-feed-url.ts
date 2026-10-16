import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFeedUrlTool = SlateTool.create(spec, {
  name: 'Get Feed URL',
  key: 'get_feed_url',
  description:
    'Retrieve the standalone Beamer feed URL with optional language, segmentation, user identity, and appearance settings.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      language: z.string().optional().describe('ISO-639 two-letter language code'),
      filterByUrl: z.boolean().optional().describe('Apply URL filtering to the feed'),
      filter: z.string().optional().describe('Segmentation filter'),
      forceFilter: z.string().optional().describe('Only include posts matching this filter'),
      userId: z.string().optional().describe('ID of the user viewing the feed'),
      userEmail: z.string().optional().describe('Email of the user viewing the feed'),
      userFirstName: z.string().optional().describe('User first name'),
      userLastName: z.string().optional().describe('User last name'),
      theme: z.string().optional().describe('CSS theme class for the feed')
    })
  )
  .output(z.object({ url: z.string().describe('Standalone feed URL') }))
  .handleInvocation(async ctx => {
    let output = await new Client({ token: ctx.auth.token }).getFeedUrl(ctx.input);
    return { output, message: 'Retrieved the Beamer feed URL.' };
  })
  .build();
