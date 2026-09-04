import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

type TextRange =
  | { type: 'ALL' }
  | { type: 'FIXED_RANGE'; startIndex: number; endIndex: number };

let getTextRange = (input: {
  rangeType?: 'fixed' | 'all';
  startIndex?: number;
  endIndex?: number;
}): TextRange => {
  if (input.rangeType === 'all') {
    if (input.startIndex !== undefined || input.endIndex !== undefined) {
      throw createApiServiceError('Omit startIndex and endIndex when rangeType is "all".', {
        reason: 'google_slides_text_range_conflict'
      });
    }
    return { type: 'ALL' };
  }

  if (input.startIndex === undefined || input.endIndex === undefined) {
    throw createApiServiceError(
      'startIndex and endIndex are required when rangeType is "fixed". Use rangeType "all" to target all text without calculating indexes.',
      { reason: 'google_slides_text_range_required' }
    );
  }
  if (input.endIndex <= input.startIndex) {
    throw createApiServiceError(
      'endIndex must be greater than startIndex. Use rangeType "all" to target all text without calculating indexes.',
      { reason: 'google_slides_text_range_invalid' }
    );
  }

  return {
    type: 'FIXED_RANGE',
    startIndex: input.startIndex,
    endIndex: input.endIndex
  };
};

export let editText = SlateTool.create(spec, {
  name: 'Edit Text',
  key: 'edit_text',
  description: `Insert, delete, or style text within a specific text box or shape element on a slide. Use this for targeted edits to individual page elements. For bulk placeholder replacement across the entire presentation, use the **Replace Text** tool instead.`,
  instructions: [
    'You need the objectId of the specific text box or shape element (not the slide ID). Use Get Presentation to find element IDs.',
    'When inserting text, specify the insertionIndex (0-based character position). Use 0 to insert at the beginning.',
    'To delete, style, or format all text in an element, set rangeType to all and omit startIndex/endIndex. Do not guess the element text length.',
    'For a partial delete, style, or bullet change, use rangeType fixed with startIndex and endIndex. Google Slides text indexes include an implicit trailing newline, so use indexes returned by Get Presentation.',
    'Text styling supports font, size, color, bold, italic, underline, and links.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.editText)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      elementObjectId: z
        .string()
        .describe('Object ID of the text box or shape element to edit'),
      action: z
        .enum(['insert', 'delete', 'style', 'bullets'])
        .describe('Text action to perform'),

      rangeType: z
        .enum(['fixed', 'all'])
        .optional()
        .describe(
          'Range selection for delete, style, and bullets. Use "all" for the entire element and omit indexes; "fixed" (default) requires startIndex and endIndex.'
        ),

      text: z.string().optional().describe('Text to insert (for insert action)'),
      insertionIndex: z
        .number()
        .optional()
        .describe('Character index at which to insert text (for insert action, 0-based)'),

      startIndex: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Start of a partial character range (required for delete, style, and bullets when rangeType is "fixed")'
        ),
      endIndex: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Exclusive end of a partial character range (required for delete, style, and bullets when rangeType is "fixed")'
        ),

      bold: z.boolean().optional().describe('Set bold (for style action)'),
      italic: z.boolean().optional().describe('Set italic (for style action)'),
      underline: z.boolean().optional().describe('Set underline (for style action)'),
      fontFamily: z.string().optional().describe('Font family name (for style action)'),
      fontSize: z.number().optional().describe('Font size in points (for style action)'),
      foregroundColorHex: z
        .string()
        .optional()
        .describe('Text color as hex, e.g. "#FF0000" (for style action)'),
      linkUrl: z.string().optional().describe('URL to link the text to (for style action)'),

      bulletPreset: z
        .string()
        .optional()
        .describe(
          'Bullet preset, e.g. BULLET_DISC_CIRCLE_SQUARE, NUMBERED_DIGIT_ALPHA_ROMAN (for bullets action)'
        )
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      elementObjectId: z.string().describe('Object ID of the modified element'),
      action: z.string().describe('Action that was performed'),
      replies: z.array(z.any()).optional().describe('Raw API replies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let { presentationId, elementObjectId, action } = ctx.input;
    let result: any;

    switch (action) {
      case 'insert': {
        if (ctx.input.text === undefined) {
          throw createApiServiceError('text is required for insert action', {
            reason: 'google_slides_insert_text_required'
          });
        }
        result = await client.insertText(
          presentationId,
          elementObjectId,
          ctx.input.text,
          ctx.input.insertionIndex
        );
        break;
      }
      case 'delete': {
        result = await client.deleteText(
          presentationId,
          elementObjectId,
          getTextRange(ctx.input)
        );
        break;
      }
      case 'style': {
        let style: any = {};
        let fields: string[] = [];

        if (ctx.input.bold !== undefined) {
          style.bold = ctx.input.bold;
          fields.push('bold');
        }
        if (ctx.input.italic !== undefined) {
          style.italic = ctx.input.italic;
          fields.push('italic');
        }
        if (ctx.input.underline !== undefined) {
          style.underline = ctx.input.underline;
          fields.push('underline');
        }
        if (ctx.input.fontFamily) {
          style.fontFamily = ctx.input.fontFamily;
          fields.push('fontFamily');
        }
        if (ctx.input.fontSize) {
          style.fontSize = { magnitude: ctx.input.fontSize, unit: 'PT' };
          fields.push('fontSize');
        }
        if (ctx.input.foregroundColorHex) {
          let hex = ctx.input.foregroundColorHex.replace('#', '');
          let r = Number.parseInt(hex.substring(0, 2), 16) / 255;
          let g = Number.parseInt(hex.substring(2, 4), 16) / 255;
          let b = Number.parseInt(hex.substring(4, 6), 16) / 255;
          style.foregroundColor = {
            opaqueColor: {
              rgbColor: { red: r, green: g, blue: b }
            }
          };
          fields.push('foregroundColor');
        }
        if (ctx.input.linkUrl) {
          style.link = { url: ctx.input.linkUrl };
          fields.push('link');
        }

        if (fields.length === 0) {
          throw createApiServiceError(
            'At least one style property must be provided for style action',
            { reason: 'google_slides_text_style_required' }
          );
        }

        result = await client.updateTextStyle(
          presentationId,
          elementObjectId,
          style,
          getTextRange(ctx.input),
          fields.join(',')
        );
        break;
      }
      case 'bullets': {
        result = await client.createParagraphBullets(
          presentationId,
          elementObjectId,
          getTextRange(ctx.input),
          ctx.input.bulletPreset || 'BULLET_DISC_CIRCLE_SQUARE'
        );
        break;
      }
    }

    let actionMessages: Record<string, string> = {
      insert: `Inserted text into element \`${elementObjectId}\`.`,
      delete:
        ctx.input.rangeType === 'all'
          ? `Deleted all text from element \`${elementObjectId}\`.`
          : `Deleted text from element \`${elementObjectId}\` (range ${ctx.input.startIndex}-${ctx.input.endIndex}).`,
      style: `Applied text styling to element \`${elementObjectId}\`.`,
      bullets: `Applied bullet formatting to element \`${elementObjectId}\`.`
    };

    return {
      output: {
        presentationId,
        elementObjectId,
        action,
        replies: result?.replies
      },
      message: actionMessages[action] || `Edited text in element \`${elementObjectId}\`.`
    };
  })
  .build();
