import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let layerSchema = z.object({
  type: z.string().describe('Layer type (e.g. "canvas", "text", "image")'),
  name: z.string().describe('Layer name used for customization'),
  width: z.string().describe('Layer width'),
  height: z.string().describe('Layer height'),
  text: z.string().nullable().optional().describe('Default text content for text layers')
});

let templateSchema = z.object({
  templateId: z.string().describe('Unique template identifier'),
  name: z.string().describe('Template name'),
  thumbnail: z.string().describe('URL of the template thumbnail image'),
  dateCreated: z.string().describe('ISO 8601 creation date'),
  dateUpdated: z.string().describe('ISO 8601 last update date'),
  layers: z.array(layerSchema).describe('Template layer definitions')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List all available image templates in your DynaPictures account. Returns template metadata including names, thumbnails, dates, and layer definitions. Use this to discover templates and their layer names before generating images.`,
  constraints: ['Only templates with "Sync to Zapier" enabled will appear in the list.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      templates: z.array(templateSchema).describe('List of available templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let templates = await client.listTemplates();

    let mapped = templates.map(t => ({
      templateId: t.id,
      name: t.name,
      thumbnail: t.thumbnail,
      dateCreated: t.dateCreated,
      dateUpdated: t.dateUpdated,
      layers: t.layers
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** template(s).`
    };
  })
  .build();
