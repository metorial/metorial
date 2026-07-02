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

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve details for a specific DynaPictures template including its layer definitions. Use this to inspect a template's structure and discover available layer names, types, and dimensions before generating images.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID (UID) of the template to retrieve')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique template identifier'),
      name: z.string().describe('Template name'),
      thumbnail: z.string().describe('URL of the template thumbnail image'),
      dateCreated: z.string().describe('ISO 8601 creation date'),
      dateUpdated: z.string().describe('ISO 8601 last update date'),
      layers: z.array(layerSchema).describe('Template layer definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let template = await client.getTemplate(ctx.input.templateId);

    return {
      output: {
        templateId: template.id,
        name: template.name,
        thumbnail: template.thumbnail,
        dateCreated: template.dateCreated,
        dateUpdated: template.dateUpdated,
        layers: template.layers
      },
      message: `Template **${template.name}** has **${template.layers.length}** layer(s).`
    };
  })
  .build();
