import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let editText = SlateTool.create(spec, {
  name: 'Edit Text',
  key: 'edit_text',
  description: `Insert, delete, or style text within a specific text box or shape element on a slide. Use this for targeted edits to individual page elements. For bulk placeholder replacement across the entire presentation, use the **Replace Text** tool instead.`,
  instructions: [
    'You need the objectId of the specific text box or shape element (not the slide ID). Use Get Presentation to find element IDs.',
    'When inserting text, specify the insertionIndex (0-based character position). Use 0 to insert at the beginning.',
    'When deleting text, specify startIndex and endIndex for the character range to remove.',
    'Text styling is applied to a range via startIndex/endIndex and supports font, size, color, bold, italic, underline, and links.'
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

      text: z.string().optional().describe('Text to insert (for insert action)'),
      insertionIndex: z
        .number()
        .optional()
        .describe('Character index at which to insert text (for insert action, 0-based)'),

      startIndex: z
        .number()
        .optional()
        .describe('Start of the character range (for delete and style actions)'),
      endIndex: z
        .number()
        .optional()
        .describe('End of the character range (for delete and style actions)'),

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
          throw new Error('text is required for insert action');
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
        if (ctx.input.startIndex === undefined || ctx.input.endIndex === undefined) {
          throw new Error('startIndex and endIndex are required for delete action');
        }
        result = await client.deleteText(
          presentationId,
          elementObjectId,
          ctx.input.startIndex,
          ctx.input.endIndex
        );
        break;
      }
      case 'style': {
        if (ctx.input.startIndex === undefined || ctx.input.endIndex === undefined) {
          throw new Error('startIndex and endIndex are required for style action');
        }

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
          throw new Error('At least one style property must be provided for style action');
        }

        result = await client.updateTextStyle(
          presentationId,
          elementObjectId,
          style,
          {
            type: 'FIXED_RANGE',
            startIndex: ctx.input.startIndex,
            endIndex: ctx.input.endIndex
          },
          fields.join(',')
        );
        break;
      }
      case 'bullets': {
        if (ctx.input.startIndex === undefined || ctx.input.endIndex === undefined) {
          throw new Error('startIndex and endIndex are required for bullets action');
        }
        result = await client.createParagraphBullets(
          presentationId,
          elementObjectId,
          {
            type: 'FIXED_RANGE',
            startIndex: ctx.input.startIndex,
            endIndex: ctx.input.endIndex
          },
          ctx.input.bulletPreset || 'BULLET_DISC_CIRCLE_SQUARE'
        );
        break;
      }
    }

    let actionMessages: Record<string, string> = {
      insert: `Inserted text into element \`${elementObjectId}\`.`,
      delete: `Deleted text from element \`${elementObjectId}\` (range ${ctx.input.startIndex}-${ctx.input.endIndex}).`,
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
