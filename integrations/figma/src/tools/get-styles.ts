import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

let styleSchema = z.object({
  styleKey: z.string().describe('Unique style key'),
  name: z.string().describe('Style name'),
  description: z.string().optional().describe('Style description'),
  styleType: z.string().optional().describe('Style type (FILL, TEXT, EFFECT, GRID)'),
  fileKey: z.string().optional().describe('File key containing this style'),
  nodeId: z.string().optional().describe('Node ID of the style'),
  thumbnailUrl: z.string().optional().describe('Thumbnail URL for the style'),
  createdAt: z.string().optional().describe('When the style was created'),
  updatedAt: z.string().optional().describe('When the style was last updated')
});

export let getStyles = SlateTool.create(spec, {
  name: 'Get Styles',
  key: 'get_styles',
  description: `Retrieve published styles from a Figma team or file. Returns style metadata including name, description, type (FILL, TEXT, EFFECT, GRID), and thumbnail.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Team ID to get all team styles'),
      fileKey: z.string().optional().describe('File key to get styles from a specific file'),
      styleKey: z
        .string()
        .optional()
        .describe('Specific style key to get details for a single style'),
      pageSize: z.number().optional().describe('Number of styles to return (team-level only)'),
      cursor: z.number().optional().describe('Pagination cursor (team-level only)')
    })
  )
  .output(
    z.object({
      styles: z.array(styleSchema).describe('List of styles'),
      cursor: z.number().optional().describe('Pagination cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);

    if (ctx.input.styleKey) {
      let result = await client.getStyle(ctx.input.styleKey);
      let s = result.meta;
      return {
        output: {
          styles: [
            {
              styleKey: s.key,
              name: s.name,
              description: s.description,
              styleType: s.style_type,
              fileKey: s.file_key,
              nodeId: s.node_id,
              thumbnailUrl: s.thumbnail_url,
              createdAt: s.created_at,
              updatedAt: s.updated_at
            }
          ]
        },
        message: `Retrieved style **${s.name}**`
      };
    }

    if (ctx.input.fileKey) {
      let result = await client.getFileStyles(ctx.input.fileKey);
      let styles = (result.meta?.styles || []).map((s: any) => ({
        styleKey: s.key,
        name: s.name,
        description: s.description,
        styleType: s.style_type,
        fileKey: s.file_key,
        nodeId: s.node_id,
        thumbnailUrl: s.thumbnail_url,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));

      return {
        output: { styles },
        message: `Found **${styles.length}** style(s) in file`
      };
    }

    if (ctx.input.teamId) {
      let result = await client.getTeamStyles(ctx.input.teamId, {
        pageSize: ctx.input.pageSize,
        after: ctx.input.cursor
      });

      let styles = (result.meta?.styles || []).map((s: any) => ({
        styleKey: s.key,
        name: s.name,
        description: s.description,
        styleType: s.style_type,
        fileKey: s.file_key,
        nodeId: s.node_id,
        thumbnailUrl: s.thumbnail_url,
        createdAt: s.created_at,
        updatedAt: s.updated_at
      }));

      return {
        output: {
          styles,
          cursor: result.meta?.cursor?.after
        },
        message: `Found **${styles.length}** style(s) in team`
      };
    }

    throw new Error('Provide at least one of teamId, fileKey, or styleKey');
  })
  .build();
