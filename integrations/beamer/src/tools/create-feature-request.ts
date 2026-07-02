import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let featureRequestTranslationSchema = z.object({
  title: z.string().describe('Title of the feature request in this language'),
  content: z.string().describe('Description/content in this language'),
  language: z.string().optional().describe('ISO-639 two-letter language code')
});

let featureRequestTranslationOutput = z.object({
  title: z.string().describe('Title'),
  content: z.string().describe('Plain text content'),
  contentHtml: z.string().describe('HTML content'),
  language: z.string().describe('Language code'),
  permalink: z.string().nullable().describe('Permalink URL'),
  images: z.array(z.string()).describe('Image URLs')
});

export let featureRequestOutputSchema = z.object({
  requestId: z.number().describe('Unique feature request ID'),
  date: z.string().describe('Creation date (ISO-8601)'),
  visible: z.boolean().describe('Whether publicly visible'),
  category: z.string().nullable().describe('Category'),
  status: z
    .string()
    .nullable()
    .describe('Status (e.g., under_review, planned, in_progress, complete)'),
  translations: z
    .array(featureRequestTranslationOutput)
    .describe('Feature request translations'),
  votesCount: z.number().describe('Number of votes'),
  commentsCount: z.number().describe('Number of comments'),
  notes: z.string().nullable().describe('Internal team notes'),
  filters: z.string().nullable().describe('Segmentation filter'),
  userId: z.string().nullable().describe('Requester user ID'),
  userEmail: z.string().nullable().describe('Requester email'),
  userFirstname: z.string().nullable().describe('Requester first name'),
  userLastname: z.string().nullable().describe('Requester last name')
});

export let createFeatureRequestTool = SlateTool.create(spec, {
  name: 'Create Feature Request',
  key: 'create_feature_request',
  description: `Create a new feature request or idea in Beamer. Supports multi-language translations, status tracking, visibility settings, and user attribution.`,
  instructions: [
    'Provide at least one translation with title and content.',
    'Use status to set the initial state: "under_review", "planned", "in_progress", or "complete".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      translations: z
        .array(featureRequestTranslationSchema)
        .min(1)
        .describe('Feature request translations (at least one required)'),
      category: z.string().optional().describe('Category name'),
      status: z
        .string()
        .optional()
        .describe(
          'Initial status (e.g., "under_review", "planned", "in_progress", "complete")'
        ),
      visible: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether the request is publicly visible'),
      notes: z.string().optional().describe('Internal team notes'),
      filters: z.string().optional().describe('Segmentation filter'),
      userId: z.string().optional().describe('Requester user ID'),
      userEmail: z.string().optional().describe('Requester email'),
      userFirstname: z.string().optional().describe('Requester first name'),
      userLastname: z.string().optional().describe('Requester last name')
    })
  )
  .output(featureRequestOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let titles = ctx.input.translations.map(t => t.title);
    let contents = ctx.input.translations.map(t => t.content);
    let languages = ctx.input.translations.map(t => t.language).filter(Boolean) as string[];

    let request = await client.createFeatureRequest({
      title: titles,
      content: contents,
      ...(languages.length > 0 ? { language: languages } : {}),
      category: ctx.input.category,
      status: ctx.input.status,
      visible: ctx.input.visible,
      notes: ctx.input.notes,
      filters: ctx.input.filters,
      userId: ctx.input.userId,
      userEmail: ctx.input.userEmail,
      userFirstname: ctx.input.userFirstname,
      userLastname: ctx.input.userLastname
    });

    let primaryTitle = request.translations?.[0]?.title ?? 'Untitled';

    return {
      output: {
        requestId: request.id,
        date: request.date,
        visible: request.visible,
        category: request.category,
        status: request.status,
        translations: request.translations ?? [],
        votesCount: request.votesCount,
        commentsCount: request.commentsCount,
        notes: request.notes,
        filters: request.filters,
        userId: request.userId,
        userEmail: request.userEmail,
        userFirstname: request.userFirstname,
        userLastname: request.userLastname
      },
      message: `Created feature request **"${primaryTitle}"** (ID: ${request.id}). Status: ${request.status ?? 'not set'}.`
    };
  })
  .build();
