import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUnreadCountTool = SlateTool.create(spec, {
  name: 'Get Unread Count',
  key: 'get_unread_count',
  description: `Retrieve the number of unread Beamer posts for a user, along with the feed URL. Useful for showing notification badges and linking to the changelog feed. Supports segmentation and user identification.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('Segmentation filter'),
      forceFilter: z.string().optional().describe('Enforce exact segmentation match'),
      filterUrl: z.string().optional().describe('URL-based segmentation'),
      dateFrom: z.string().optional().describe('Count posts after this date (ISO-8601)'),
      language: z.string().optional().describe('ISO-639 language code'),
      category: z.string().optional().describe('Filter by category'),
      userId: z.string().optional().describe('User ID for personalized count'),
      userEmail: z.string().optional().describe('User email'),
      userFirstName: z.string().optional().describe('User first name'),
      userLastName: z.string().optional().describe('User last name'),
      ignoreFilters: z.boolean().optional().describe('Ignore segmentation')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of unread posts'),
      feedUrl: z.string().describe('URL of the user feed'),
      popupUrl: z.string().describe('URL of the popup feed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getUnreadCount({
      filter: ctx.input.filter,
      forceFilter: ctx.input.forceFilter,
      filterUrl: ctx.input.filterUrl,
      dateFrom: ctx.input.dateFrom,
      language: ctx.input.language,
      category: ctx.input.category,
      userId: ctx.input.userId,
      userEmail: ctx.input.userEmail,
      userFirstName: ctx.input.userFirstName,
      userLastName: ctx.input.userLastName,
      ignoreFilters: ctx.input.ignoreFilters
    });

    return {
      output: {
        count: result.count,
        feedUrl: result.url,
        popupUrl: result.popupUrl
      },
      message: `User has **${result.count}** unread post(s).`
    };
  })
  .build();
