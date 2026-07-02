import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { postOutputSchema } from './create-post';

let translationUpdateSchema = z.object({
  title: z.string().describe('Title of the post in this language'),
  content: z.string().describe('HTML content of the post in this language'),
  language: z.string().optional().describe('ISO-639 two-letter language code'),
  linkUrl: z.string().optional().describe('Call-to-action URL'),
  linkText: z.string().optional().describe('Call-to-action button text'),
  customCategory: z.string().optional().describe('Custom category name for this translation')
});

export let updatePostTool = SlateTool.create(spec, {
  name: 'Update Post',
  key: 'update_post',
  description: `Update an existing Beamer post. Modify content, translations, category, scheduling, segmentation, and display settings. Only provided fields will be updated.`,
  instructions: [
    'Provide the postId of the post to update.',
    'Only include fields you want to change.',
    'When updating translations, provide the full translations array.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.number().describe('ID of the post to update'),
      translations: z
        .array(translationUpdateSchema)
        .optional()
        .describe('Updated translations'),
      category: z
        .enum(['new', 'improvement', 'fix'])
        .optional()
        .describe('Built-in post category'),
      publish: z.boolean().optional().describe('Publish or unpublish the post'),
      archive: z.boolean().optional().describe('Archive or unarchive the post'),
      pinned: z.boolean().optional().describe('Pin or unpin the post'),
      showInWidget: z.boolean().optional().describe('Show in the embedded widget'),
      showInStandalone: z.boolean().optional().describe('Show in the standalone feed'),
      boostedAnnouncement: z.string().optional().describe('Boost level'),
      linksInNewWindow: z.boolean().optional().describe('Open links in a new window'),
      date: z.string().optional().describe('Publication date (ISO-8601)'),
      dueDate: z.string().optional().describe('Expiration date (ISO-8601)'),
      filter: z.string().optional().describe('Segmentation filter'),
      filterUserId: z.string().optional().describe('Target a specific user'),
      filterUrl: z.string().optional().describe('URL-based segmentation'),
      enableFeedback: z.boolean().optional().describe('Allow comments/feedback'),
      enableReactions: z.boolean().optional().describe('Allow emoji reactions'),
      enableSocialShare: z.boolean().optional().describe('Enable social sharing'),
      autoOpen: z.boolean().optional().describe('Auto-open the post'),
      sendPushNotification: z.boolean().optional().describe('Send push notification')
    })
  )
  .output(postOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, unknown> = {};

    if (ctx.input.translations) {
      updateData.title = ctx.input.translations.map(t => t.title);
      updateData.content = ctx.input.translations.map(t => t.content);
      let languages = ctx.input.translations.map(t => t.language).filter(Boolean);
      let linkUrls = ctx.input.translations.map(t => t.linkUrl).filter(Boolean);
      let linkTexts = ctx.input.translations.map(t => t.linkText).filter(Boolean);
      let customCategories = ctx.input.translations.map(t => t.customCategory).filter(Boolean);
      if (languages.length > 0) updateData.language = languages;
      if (linkUrls.length > 0) updateData.linkUrl = linkUrls;
      if (linkTexts.length > 0) updateData.linkText = linkTexts;
      if (customCategories.length > 0) updateData.customCategory = customCategories;
    }

    if (ctx.input.category !== undefined) updateData.category = ctx.input.category;
    if (ctx.input.publish !== undefined) updateData.publish = ctx.input.publish;
    if (ctx.input.archive !== undefined) updateData.archive = ctx.input.archive;
    if (ctx.input.pinned !== undefined) updateData.pinned = ctx.input.pinned;
    if (ctx.input.showInWidget !== undefined) updateData.showInWidget = ctx.input.showInWidget;
    if (ctx.input.showInStandalone !== undefined)
      updateData.showInStandalone = ctx.input.showInStandalone;
    if (ctx.input.boostedAnnouncement !== undefined)
      updateData.boostedAnnouncement = ctx.input.boostedAnnouncement;
    if (ctx.input.linksInNewWindow !== undefined)
      updateData.linksInNewWindow = ctx.input.linksInNewWindow;
    if (ctx.input.date !== undefined) updateData.date = ctx.input.date;
    if (ctx.input.dueDate !== undefined) updateData.dueDate = ctx.input.dueDate;
    if (ctx.input.filter !== undefined) updateData.filter = ctx.input.filter;
    if (ctx.input.filterUserId !== undefined) updateData.filterUserId = ctx.input.filterUserId;
    if (ctx.input.filterUrl !== undefined) updateData.filterUrl = ctx.input.filterUrl;
    if (ctx.input.enableFeedback !== undefined)
      updateData.enableFeedback = ctx.input.enableFeedback;
    if (ctx.input.enableReactions !== undefined)
      updateData.enableReactions = ctx.input.enableReactions;
    if (ctx.input.enableSocialShare !== undefined)
      updateData.enableSocialShare = ctx.input.enableSocialShare;
    if (ctx.input.autoOpen !== undefined) updateData.autoOpen = ctx.input.autoOpen;
    if (ctx.input.sendPushNotification !== undefined)
      updateData.sendPushNotification = ctx.input.sendPushNotification;

    let post = await client.updatePost(ctx.input.postId, updateData);

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
      message: `Updated post **"${primaryTitle}"** (ID: ${post.id}).`
    };
  })
  .build();
