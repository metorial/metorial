import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { postOutputSchema } from './create-post';

export let getPostTool = SlateTool.create(spec, {
  name: 'Get Post',
  key: 'get_post',
  description: `Retrieve a specific Beamer post by its ID. Returns full post details including translations, category, engagement metrics (views, clicks, reactions), and display settings.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.number().describe('ID of the post to retrieve')
    })
  )
  .output(postOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let post = await client.getPost(ctx.input.postId);

    let primaryTitle = post.translations?.[0]?.title ?? 'Untitled';

    return {
      output: {
        postId: post.id,
        date: post.date,
        dueDate: post.dueDate,
        published: post.published,
        pinned: post.pinned,
        showInWidget: post.showInWidget,
        showInStandalone: post.showInStandalone,
        category: post.category,
        boostedAnnouncement: post.boostedAnnouncement,
        translations: post.translations ?? [],
        filter: post.filter,
        filterUrl: post.filterUrl,
        autoOpen: post.autoOpen,
        feedbackEnabled: post.feedbackEnabled,
        reactionsEnabled: post.reactionsEnabled,
        views: post.views,
        uniqueViews: post.uniqueViews,
        clicks: post.clicks,
        positiveReactions: post.positiveReactions,
        neutralReactions: post.neutralReactions,
        negativeReactions: post.negativeReactions
      },
      message: `Retrieved post **"${primaryTitle}"** (ID: ${post.id}). Category: **${post.category}**, Views: ${post.views}, Published: ${post.published}.`
    };
  })
  .build();
