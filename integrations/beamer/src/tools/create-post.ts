import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let translationSchema = z.object({
  title: z.string().describe('Title of the post in this language'),
  content: z.string().describe('HTML content of the post in this language'),
  language: z
    .string()
    .optional()
    .describe('ISO-639 two-letter language code (e.g., "EN", "ES", "FR")'),
  linkUrl: z.string().optional().describe('Call-to-action URL'),
  linkText: z.string().optional().describe('Call-to-action button text'),
  customCategory: z.string().optional().describe('Custom category name for this translation')
});

let postTranslationOutput = z.object({
  title: z.string().describe('Title text'),
  content: z.string().describe('Plain text content'),
  contentHtml: z.string().describe('HTML content'),
  language: z.string().describe('Language code'),
  category: z.string().describe('Category name'),
  linkUrl: z.string().describe('CTA URL'),
  linkText: z.string().describe('CTA text'),
  images: z.array(z.string()).describe('Image URLs')
});

export let postOutputSchema = z.object({
  postId: z.number().describe('Unique post ID'),
  date: z.string().describe('Publication date (ISO-8601)'),
  dueDate: z.string().nullable().describe('Expiration date (ISO-8601)'),
  published: z.boolean().describe('Whether the post is published'),
  pinned: z.boolean().describe('Whether the post is pinned'),
  showInWidget: z.boolean().describe('Visible in widget'),
  showInStandalone: z.boolean().describe('Visible in standalone feed'),
  category: z.string().describe('Post category'),
  boostedAnnouncement: z.string().nullable().describe('Boost level'),
  translations: z.array(postTranslationOutput).describe('Post content translations'),
  filter: z.string().nullable().describe('Segmentation filter'),
  filterUrl: z.string().nullable().describe('URL segmentation filter'),
  autoOpen: z.boolean().describe('Auto-open on load'),
  feedbackEnabled: z.boolean().describe('Feedback enabled'),
  reactionsEnabled: z.boolean().describe('Reactions enabled'),
  views: z.number().describe('Total views'),
  uniqueViews: z.number().describe('Unique views'),
  clicks: z.number().describe('Total clicks'),
  positiveReactions: z.number().describe('Positive reaction count'),
  neutralReactions: z.number().describe('Neutral reaction count'),
  negativeReactions: z.number().describe('Negative reaction count')
});

export let createPostTool = SlateTool.create(spec, {
  name: 'Create Post',
  key: 'create_post',
  description: `Create a new changelog post or announcement in Beamer. Supports multi-language translations, categories (new, improvement, fix, or custom), scheduling, segmentation filters, and rich HTML content. Can target specific users or user segments.`,
  instructions: [
    'Provide at least one translation with title and content.',
    'Use the category field for built-in categories: "new", "improvement", or "fix".',
    'Use filterUserId to send single-user notifications.',
    'Set publish to true to publish immediately, or false to save as draft.'
  ],
  constraints: ['Rate limit: 30 requests/second for paid accounts.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      translations: z
        .array(translationSchema)
        .min(1)
        .describe('Post content translations (at least one required)'),
      category: z
        .enum(['new', 'improvement', 'fix'])
        .optional()
        .describe('Built-in post category'),
      publish: z.boolean().optional().default(true).describe('Publish the post immediately'),
      archive: z.boolean().optional().describe('Archive the post'),
      pinned: z.boolean().optional().describe('Pin the post to the top of the feed'),
      showInWidget: z.boolean().optional().describe('Show in the embedded widget'),
      showInStandalone: z.boolean().optional().describe('Show in the standalone feed'),
      boostedAnnouncement: z.string().optional().describe('Boost level (e.g., "snippet")'),
      linksInNewWindow: z.boolean().optional().describe('Open links in a new window'),
      date: z.string().optional().describe('Publication date (ISO-8601). Defaults to now.'),
      dueDate: z.string().optional().describe('Expiration date (ISO-8601)'),
      filter: z
        .string()
        .optional()
        .describe('Segmentation filter name (e.g., "admins;paid-users")'),
      filterUserId: z.string().optional().describe('Target a specific user by their ID'),
      filterUrl: z.string().optional().describe('URL-based segmentation filter'),
      enableFeedback: z.boolean().optional().describe('Allow user comments/feedback'),
      enableReactions: z.boolean().optional().describe('Allow emoji reactions'),
      enableSocialShare: z.boolean().optional().describe('Enable social media sharing'),
      autoOpen: z.boolean().optional().describe('Auto-open the post sidebar'),
      sendPushNotification: z
        .boolean()
        .optional()
        .describe('Send push notification on publish'),
      fixedBoostedAnnouncement: z.boolean().optional().describe('Pin the boosted announcement')
    })
  )
  .output(postOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let titles = ctx.input.translations.map(t => t.title);
    let contents = ctx.input.translations.map(t => t.content);
    let languages = ctx.input.translations.map(t => t.language).filter(Boolean) as string[];
    let linkUrls = ctx.input.translations.map(t => t.linkUrl).filter(Boolean) as string[];
    let linkTexts = ctx.input.translations.map(t => t.linkText).filter(Boolean) as string[];
    let customCategories = ctx.input.translations
      .map(t => t.customCategory)
      .filter(Boolean) as string[];

    let post = await client.createPost({
      title: titles,
      content: contents,
      ...(languages.length > 0 ? { language: languages } : {}),
      ...(linkUrls.length > 0 ? { linkUrl: linkUrls } : {}),
      ...(linkTexts.length > 0 ? { linkText: linkTexts } : {}),
      ...(customCategories.length > 0 ? { customCategory: customCategories } : {}),
      category: ctx.input.category,
      publish: ctx.input.publish,
      archive: ctx.input.archive,
      pinned: ctx.input.pinned,
      showInWidget: ctx.input.showInWidget,
      showInStandalone: ctx.input.showInStandalone,
      boostedAnnouncement: ctx.input.boostedAnnouncement,
      linksInNewWindow: ctx.input.linksInNewWindow,
      date: ctx.input.date,
      dueDate: ctx.input.dueDate,
      filter: ctx.input.filter,
      filterUserId: ctx.input.filterUserId,
      filterUrl: ctx.input.filterUrl,
      enableFeedback: ctx.input.enableFeedback,
      enableReactions: ctx.input.enableReactions,
      enableSocialShare: ctx.input.enableSocialShare,
      autoOpen: ctx.input.autoOpen,
      sendPushNotification: ctx.input.sendPushNotification,
      fixedBoostedAnnouncement: ctx.input.fixedBoostedAnnouncement
    });

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
      message: `Created post **"${primaryTitle}"** (ID: ${post.id}) in category **${post.category}**. Published: ${post.published}.`
    };
  })
  .build();
