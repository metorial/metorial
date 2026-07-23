import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

const CANVAS_CONTENT_OPERATIONS = [
  'insert_after',
  'insert_before',
  'insert_at_start',
  'insert_at_end',
  'replace'
] as const;

const CANVAS_SECTION_OPERATIONS = ['insert_after', 'insert_before', 'delete'] as const;

type CanvasOperation =
  | (typeof CANVAS_CONTENT_OPERATIONS)[number]
  | (typeof CANVAS_SECTION_OPERATIONS)[number]
  | 'rename';

let validateCanvasEdit = (input: {
  operation: CanvasOperation;
  content?: string;
  sectionId?: string;
  title?: string;
}) => {
  let usesContent = CANVAS_CONTENT_OPERATIONS.includes(
    input.operation as (typeof CANVAS_CONTENT_OPERATIONS)[number]
  );
  let requiresSection = CANVAS_SECTION_OPERATIONS.includes(
    input.operation as (typeof CANVAS_SECTION_OPERATIONS)[number]
  );

  if (usesContent && input.content === undefined) {
    throw slackServiceError(`content is required for the ${input.operation} operation`);
  }
  if (!usesContent && input.content !== undefined) {
    throw slackServiceError(`content is not supported for the ${input.operation} operation`);
  }
  if (requiresSection && input.sectionId === undefined) {
    throw slackServiceError(`sectionId is required for the ${input.operation} operation`);
  }
  if (input.sectionId !== undefined && !requiresSection && input.operation !== 'replace') {
    throw slackServiceError(`sectionId is not supported for the ${input.operation} operation`);
  }
  if (input.operation === 'rename' && input.title === undefined) {
    throw slackServiceError('title is required for the rename operation');
  }
  if (input.operation !== 'rename' && input.title !== undefined) {
    throw slackServiceError(`title is not supported for the ${input.operation} operation`);
  }
};

export let editCanvas = SlateTool.create(spec, {
  name: 'Edit Canvas',
  key: 'edit_canvas',
  description:
    'Insert, replace, delete, or rename Slack Canvas content. A replace operation without sectionId replaces the entire Canvas document and is destructive.',
  instructions: [
    'Use lookup_canvas_sections first when a focused section edit is possible.',
    'For insert_after, insert_before, or delete, provide sectionId.',
    'For replace, provide sectionId to replace only that section. Omitting sectionId replaces the whole document.',
    'Use rename with title only. Use content for insert and replace operations.'
  ],
  constraints: [
    'Replacing without sectionId overwrites the entire Canvas document. Confirm that whole-document replacement is intended before invoking it.',
    'Deleting a section is destructive and requires its exact sectionId.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(slackActionScopes.canvasesWrite)
  .input(
    z.object({
      canvasId: z.string().trim().min(1).describe('Slack Canvas ID to edit'),
      operation: z
        .enum([
          'insert_after',
          'insert_before',
          'insert_at_start',
          'insert_at_end',
          'replace',
          'delete',
          'rename'
        ])
        .describe('Canvas edit operation'),
      content: z
        .string()
        .optional()
        .describe('Canvas-flavored Markdown required for insert and replace operations'),
      sectionId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Target section ID; required for relative insertion and deletion, optional for replace'
        ),
      title: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('New Canvas title; required only for rename')
    })
  )
  .output(
    z.object({
      canvasId: z.string().describe('Edited Slack Canvas ID'),
      operation: z
        .enum([
          'insert_after',
          'insert_before',
          'insert_at_start',
          'insert_at_end',
          'replace',
          'delete',
          'rename'
        ])
        .describe('Completed edit operation'),
      sectionId: z.string().optional().describe('Target section ID when provided'),
      title: z.string().optional().describe('New Canvas title for rename'),
      wholeDocumentReplaced: z
        .boolean()
        .describe('Whether replace overwrote the entire Canvas document')
    })
  )
  .handleInvocation(async ctx => {
    validateCanvasEdit(ctx.input);

    let client = new SlackClient(ctx.auth.token);
    let canvas = await client.editCanvas({
      canvasId: ctx.input.canvasId,
      operation: ctx.input.operation,
      content: ctx.input.content,
      sectionId: ctx.input.sectionId,
      title: ctx.input.title
    });
    let wholeDocumentReplaced =
      ctx.input.operation === 'replace' && ctx.input.sectionId === undefined;

    return {
      output: {
        canvasId: canvas.id,
        operation: ctx.input.operation,
        sectionId: ctx.input.sectionId,
        title: canvas.title ?? ctx.input.title,
        wholeDocumentReplaced
      },
      message: wholeDocumentReplaced
        ? `Replaced the entire Slack Canvas document \`${canvas.id}\`.`
        : `Applied ${ctx.input.operation} to Slack Canvas \`${canvas.id}\`${ctx.input.sectionId ? ` at section \`${ctx.input.sectionId}\`` : ''}.`
    };
  })
  .build();
