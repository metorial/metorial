import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type UpdateFeatureRequestParams } from '../lib/client';
import { translationParams } from '../lib/translations';
import { spec } from '../spec';
import { featureRequestOutputSchema } from './create-feature-request';

let translationUpdateSchema = z.object({
  title: z.string().describe('Title in this language'),
  content: z.string().describe('Content in this language'),
  language: z.string().optional().describe('ISO-639 two-letter language code')
});

export let updateFeatureRequestTool = SlateTool.create(spec, {
  name: 'Update Feature Request',
  key: 'update_feature_request',
  description: `Update an existing Beamer feature request. Modify translations, status, visibility, notes, and user attribution. Only provided fields will be updated.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      requestId: z.number().describe('ID of the feature request to update'),
      translations: z
        .array(translationUpdateSchema)
        .optional()
        .describe(
          'Updated translations; if any language code is provided, supply one for every translation'
        ),
      date: z.string().optional().describe('Creation date (ISO-8601)'),
      votesCount: z.number().optional().describe('Vote count, a nonnegative whole number'),
      internalUserEmail: z
        .string()
        .optional()
        .describe('Email of the team member creating the request'),
      category: z.string().optional().describe('Category name'),
      status: z
        .string()
        .optional()
        .describe('Status (e.g., "under_review", "planned", "in_progress", "complete")'),
      visible: z.boolean().optional().describe('Public visibility'),
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

    let updateData: UpdateFeatureRequestParams = {};

    if (ctx.input.translations !== undefined) {
      Object.assign(updateData, translationParams(ctx.input.translations));
    }

    if (ctx.input.date !== undefined) updateData.date = ctx.input.date;
    if (ctx.input.votesCount !== undefined) updateData.votesCount = ctx.input.votesCount;
    if (ctx.input.internalUserEmail !== undefined)
      updateData.internalUserEmail = ctx.input.internalUserEmail;
    if (ctx.input.userId !== undefined) updateData.userId = ctx.input.userId;
    if (ctx.input.userEmail !== undefined) updateData.userEmail = ctx.input.userEmail;
    if (ctx.input.userFirstname !== undefined)
      updateData.userFirstname = ctx.input.userFirstname;
    if (ctx.input.userLastname !== undefined) updateData.userLastname = ctx.input.userLastname;
    if (ctx.input.category !== undefined) updateData.category = ctx.input.category;
    if (ctx.input.status !== undefined) updateData.status = ctx.input.status;
    if (ctx.input.visible !== undefined) updateData.visible = ctx.input.visible;
    if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;
    if (ctx.input.filters !== undefined) updateData.filters = ctx.input.filters;

    let request = await client.updateFeatureRequest(ctx.input.requestId, updateData);

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
      message: `Updated feature request **"${primaryTitle}"** (ID: ${request.id}). Status: ${request.status ?? 'not set'}.`
    };
  })
  .build();
