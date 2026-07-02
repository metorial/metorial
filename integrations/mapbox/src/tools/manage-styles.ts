import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapboxClient } from '../lib/client';
import { spec } from '../spec';

let styleSchema = z.object({
  styleId: z.string().optional().describe('Style ID'),
  version: z.number().optional().describe('Style version'),
  name: z.string().optional().describe('Style name'),
  owner: z.string().optional().describe('Style owner username'),
  created: z.string().optional().describe('Creation timestamp'),
  modified: z.string().optional().describe('Last modified timestamp'),
  visibility: z.string().optional().describe('Visibility (public or private)'),
  center: z.array(z.number()).optional().describe('Default center [longitude, latitude]'),
  zoom: z.number().optional().describe('Default zoom level'),
  draft: z.boolean().optional().describe('Whether this is a draft style'),
  layers: z.array(z.any()).optional().describe('Style layers'),
  sources: z.record(z.string(), z.any()).optional().describe('Style sources')
});

export let manageStylesTool = SlateTool.create(spec, {
  name: 'Manage Styles',
  key: 'manage_styles',
  description: `List, retrieve, create, update, or delete Mapbox map styles. Styles control the visual appearance of maps including colors, labels, layers, and icons. Use this to manage custom map styles for your applications.`,
  instructions: [
    'Use action "list" to see all available styles.',
    'Use action "get" with a styleId to retrieve full style details including layers and sources.',
    'Use action "create" with a style definition to create a new style.',
    'Use action "update" to modify an existing style (partial updates supported).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      styleId: z.string().optional().describe('Style ID (required for get, update, delete)'),
      name: z.string().optional().describe('Style name (for create/update)'),
      layers: z.array(z.any()).optional().describe('Style layers array (for create/update)'),
      sources: z
        .record(z.string(), z.any())
        .optional()
        .describe('Style sources object (for create/update)'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Style metadata (for create/update)'),
      sprite: z.string().optional().describe('Sprite URL (for create/update)'),
      glyphs: z.string().optional().describe('Glyphs URL template (for create/update)'),
      draft: z.boolean().optional().describe('Retrieve draft version (for get)'),
      limit: z.number().optional().describe('Max styles to return (for list)'),
      sortby: z.string().optional().describe('Sort field: "created" or "modified" (for list)')
    })
  )
  .output(
    z.object({
      style: styleSchema.optional().describe('Style details (for get/create/update)'),
      styles: z.array(styleSchema).optional().describe('List of styles (for list)'),
      deleted: z.boolean().optional().describe('Whether the style was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapboxClient({
      token: ctx.auth.token,
      username: ctx.config.username
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let styles = await client.listStyles({
        sortby: ctx.input.sortby,
        limit: ctx.input.limit
      });
      let mapped = (styles || []).map((s: any) => ({
        styleId: s.id,
        version: s.version,
        name: s.name,
        owner: s.owner,
        created: s.created,
        modified: s.modified,
        visibility: s.visibility,
        center: s.center,
        zoom: s.zoom,
        draft: s.draft
      }));
      return {
        output: { styles: mapped },
        message: `Found **${mapped.length}** style${mapped.length !== 1 ? 's' : ''}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.styleId) throw new Error('styleId is required for get');
      let s = await client.getStyle(ctx.input.styleId, { draft: ctx.input.draft });
      return {
        output: {
          style: {
            styleId: s.id,
            version: s.version,
            name: s.name,
            owner: s.owner,
            created: s.created,
            modified: s.modified,
            visibility: s.visibility,
            center: s.center,
            zoom: s.zoom,
            draft: s.draft,
            layers: s.layers,
            sources: s.sources
          }
        },
        message: `Retrieved style **"${s.name}"** (${s.id}).`
      };
    }

    if (action === 'create') {
      let styleBody: Record<string, any> = {
        version: 8,
        name: ctx.input.name || 'New Style',
        sources: ctx.input.sources || {},
        layers: ctx.input.layers || []
      };
      if (ctx.input.metadata) styleBody.metadata = ctx.input.metadata;
      if (ctx.input.sprite) styleBody.sprite = ctx.input.sprite;
      if (ctx.input.glyphs) styleBody.glyphs = ctx.input.glyphs;

      let s = await client.createStyle(styleBody);
      return {
        output: {
          style: {
            styleId: s.id,
            version: s.version,
            name: s.name,
            owner: s.owner,
            created: s.created,
            modified: s.modified
          }
        },
        message: `Created style **"${s.name}"** (${s.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.styleId) throw new Error('styleId is required for update');
      let updateBody: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateBody.name = ctx.input.name;
      if (ctx.input.layers !== undefined) updateBody.layers = ctx.input.layers;
      if (ctx.input.sources !== undefined) updateBody.sources = ctx.input.sources;
      if (ctx.input.metadata !== undefined) updateBody.metadata = ctx.input.metadata;
      if (ctx.input.sprite !== undefined) updateBody.sprite = ctx.input.sprite;
      if (ctx.input.glyphs !== undefined) updateBody.glyphs = ctx.input.glyphs;

      let s = await client.updateStyle(ctx.input.styleId, updateBody);
      return {
        output: {
          style: {
            styleId: s.id,
            version: s.version,
            name: s.name,
            owner: s.owner,
            modified: s.modified
          }
        },
        message: `Updated style **"${s.name}"** (${s.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.styleId) throw new Error('styleId is required for delete');
      await client.deleteStyle(ctx.input.styleId);
      return {
        output: { deleted: true },
        message: `Deleted style **${ctx.input.styleId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
