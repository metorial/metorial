import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageSlides = SlateTool.create(spec, {
  name: 'Manage Slides',
  key: 'manage_slides',
  description: `Create, duplicate, reorder, or delete slides within a presentation. Supports specifying a predefined layout (e.g. BLANK, TITLE, TITLE_AND_BODY) or a custom layout ID when creating slides. Use one action at a time.`,
  instructions: [
    'For creating slides, use predefinedLayout for standard layouts or layoutId for custom ones.',
    'Available predefined layouts: BLANK, CAPTION_ONLY, TITLE, TITLE_AND_BODY, TITLE_AND_TWO_COLUMNS, TITLE_ONLY, ONE_COLUMN_TEXT, MAIN_POINT, SECTION_HEADER, SECTION_TITLE_AND_DESCRIPTION, BIG_NUMBER.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.manageSlides)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      action: z
        .enum(['create', 'duplicate', 'move', 'delete'])
        .describe('Action to perform on the slide'),

      predefinedLayout: z
        .enum([
          'BLANK',
          'CAPTION_ONLY',
          'TITLE',
          'TITLE_AND_BODY',
          'TITLE_AND_TWO_COLUMNS',
          'TITLE_ONLY',
          'ONE_COLUMN_TEXT',
          'MAIN_POINT',
          'SECTION_HEADER',
          'SECTION_TITLE_AND_DESCRIPTION',
          'BIG_NUMBER',
          'PREDEFINED_LAYOUT_UNSPECIFIED'
        ])
        .optional()
        .describe('Predefined layout for new slide (for create action)'),
      layoutId: z
        .string()
        .optional()
        .describe('Custom layout ID from the presentation masters (for create action)'),
      insertionIndex: z
        .number()
        .optional()
        .describe(
          'Zero-based index at which to insert the slide (for create and move actions)'
        ),

      slideObjectId: z
        .string()
        .optional()
        .describe('Object ID of the slide to duplicate, move, or delete'),
      slideObjectIds: z
        .array(z.string())
        .optional()
        .describe('Object IDs of slides to move (for move action)')
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      action: z.string().describe('Action that was performed'),
      createdSlideId: z
        .string()
        .optional()
        .describe('Object ID of the newly created or duplicated slide'),
      replies: z.array(z.any()).optional().describe('Raw API replies from the batch update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let { presentationId, action } = ctx.input;
    let result: any;
    let createdSlideId: string | undefined;

    switch (action) {
      case 'create': {
        result = await client.createSlide(presentationId, {
          insertionIndex: ctx.input.insertionIndex,
          layoutId: ctx.input.layoutId,
          predefinedLayout: ctx.input.predefinedLayout || 'BLANK'
        });
        createdSlideId = result.replies?.[0]?.createSlide?.objectId;
        break;
      }
      case 'duplicate': {
        if (!ctx.input.slideObjectId) {
          throw new Error('slideObjectId is required for duplicate action');
        }
        result = await client.duplicateSlide(presentationId, ctx.input.slideObjectId);
        createdSlideId = result.replies?.[0]?.duplicateObject?.objectId;
        break;
      }
      case 'move': {
        let ids =
          ctx.input.slideObjectIds ||
          (ctx.input.slideObjectId ? [ctx.input.slideObjectId] : []);
        if (ids.length === 0) {
          throw new Error('slideObjectId or slideObjectIds is required for move action');
        }
        if (ctx.input.insertionIndex === undefined) {
          throw new Error('insertionIndex is required for move action');
        }
        result = await client.moveSlide(presentationId, ids, ctx.input.insertionIndex);
        break;
      }
      case 'delete': {
        if (!ctx.input.slideObjectId) {
          throw new Error('slideObjectId is required for delete action');
        }
        result = await client.deleteSlide(presentationId, ctx.input.slideObjectId);
        break;
      }
    }

    let actionMessages: Record<string, string> = {
      create: `Created a new slide${createdSlideId ? ` with ID \`${createdSlideId}\`` : ''}.`,
      duplicate: `Duplicated slide \`${ctx.input.slideObjectId}\`${createdSlideId ? ` → new slide \`${createdSlideId}\`` : ''}.`,
      move: `Moved slide(s) to index ${ctx.input.insertionIndex}.`,
      delete: `Deleted slide \`${ctx.input.slideObjectId}\`.`
    };

    return {
      output: {
        presentationId,
        action,
        createdSlideId,
        replies: result?.replies
      },
      message: actionMessages[action] || `Performed ${action} on presentation.`
    };
  })
  .build();
