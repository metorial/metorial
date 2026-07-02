import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { typeformServiceError } from '../lib/errors';
import { spec } from '../spec';

let themeColorsSchema = z
  .object({
    question: z.string().optional().describe('Color for question text (hex)'),
    answer: z.string().optional().describe('Color for answer text (hex)'),
    button: z.string().optional().describe('Color for buttons (hex)'),
    background: z.string().optional().describe('Background color (hex)')
  })
  .optional()
  .describe('Theme color settings');

let themeFontSchema = z.string().optional().describe('Font family name');

export let manageTheme = SlateTool.create(spec, {
  name: 'Manage Theme',
  key: 'manage_theme',
  description: `Create, retrieve, update, or delete a visual theme for typeforms. Themes control colors, fonts, backgrounds, and button styles. Apply themes to forms for consistent branding.`,
  instructions: [
    'To **create**, provide **name** and theme properties (no themeId).',
    'To **retrieve**, provide just the **themeId**.',
    'To **update**, provide **themeId** and the properties to change.',
    'To **delete**, set **delete** to true and provide **themeId**.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      themeId: z
        .string()
        .optional()
        .describe('Theme ID (required for retrieve, update, and delete)'),
      name: z.string().optional().describe('Theme name'),
      delete: z.boolean().optional().describe('Set to true to delete the theme'),
      colors: themeColorsSchema,
      font: themeFontSchema.describe('Font family for the theme'),
      backgroundImage: z.string().optional().describe('Background image URL'),
      hasTransparentButton: z
        .boolean()
        .optional()
        .describe('Whether the submit button is transparent'),
      roundedCorners: z
        .boolean()
        .optional()
        .describe('Deprecated. true maps to "small", false maps to "none"'),
      cornerStyle: z
        .enum(['none', 'small', 'large'])
        .optional()
        .describe('Rounded corner style for buttons and form elements')
    })
  )
  .output(
    z.object({
      themeId: z.string().optional().describe('Theme ID'),
      name: z.string().optional().describe('Theme name'),
      colors: z
        .object({
          question: z.string().optional(),
          answer: z.string().optional(),
          button: z.string().optional(),
          background: z.string().optional()
        })
        .optional()
        .describe('Theme colors'),
      font: z.string().optional().describe('Theme font'),
      roundedCorners: z.string().optional().describe('Rounded corner style'),
      deleted: z.boolean().optional().describe('Whether the theme was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    // Delete
    if (ctx.input.delete) {
      if (!ctx.input.themeId) {
        throw typeformServiceError('themeId is required when deleting a theme.');
      }
      await client.deleteTheme(ctx.input.themeId);
      return {
        output: {
          themeId: ctx.input.themeId,
          deleted: true
        },
        message: `Deleted theme \`${ctx.input.themeId}\`.`
      };
    }

    // Build theme data
    let themeData: Record<string, any> = {};
    if (ctx.input.name) themeData.name = ctx.input.name;
    if (ctx.input.colors) themeData.colors = ctx.input.colors;
    if (ctx.input.font) themeData.font = ctx.input.font;
    if (ctx.input.backgroundImage) {
      themeData.background = { href: ctx.input.backgroundImage };
    }
    if (ctx.input.hasTransparentButton !== undefined)
      themeData.has_transparent_button = ctx.input.hasTransparentButton;
    if (ctx.input.cornerStyle !== undefined) {
      themeData.rounded_corners = ctx.input.cornerStyle;
    } else if (ctx.input.roundedCorners !== undefined) {
      themeData.rounded_corners = ctx.input.roundedCorners ? 'small' : 'none';
    }

    if (ctx.input.themeId && ctx.input.colors) {
      let missingColors = ['answer', 'background', 'button', 'question'].filter(
        key => !(key in ctx.input.colors!)
      );
      if (missingColors.length > 0) {
        throw typeformServiceError(
          `Updating theme colors requires all color fields: ${missingColors.join(', ')} missing.`
        );
      }
    }

    // Create
    if (!ctx.input.themeId && ctx.input.name) {
      let result = await client.createTheme(themeData);
      return {
        output: {
          themeId: result.id,
          name: result.name,
          colors: result.colors,
          font: result.font,
          roundedCorners: result.rounded_corners
        },
        message: `Created theme **${result.name}**.`
      };
    }

    // Update
    if (ctx.input.themeId && Object.keys(themeData).length > 0) {
      let result = await client.updateTheme(ctx.input.themeId, themeData);
      return {
        output: {
          themeId: result.id,
          name: result.name,
          colors: result.colors,
          font: result.font,
          roundedCorners: result.rounded_corners
        },
        message: `Updated theme **${result.name}**.`
      };
    }

    // Retrieve
    if (ctx.input.themeId) {
      let result = await client.getTheme(ctx.input.themeId);
      return {
        output: {
          themeId: result.id,
          name: result.name,
          colors: result.colors,
          font: result.font,
          roundedCorners: result.rounded_corners
        },
        message: `Retrieved theme **${result.name}**.`
      };
    }

    throw typeformServiceError(
      'Provide either a name to create a theme, or a themeId to retrieve/update/delete one.'
    );
  })
  .build();
