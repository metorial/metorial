import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve a specific template by its ID, including its layers and pages. Also returns the list of editable layers in the template, useful for understanding which layers can be modified before creating a render.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('Template ID to retrieve'),
      includeLayers: z
        .boolean()
        .optional()
        .describe('Include layer data in the template response'),
      includePages: z
        .boolean()
        .optional()
        .describe('Include page data in the template response'),
      includeLockedLayers: z
        .boolean()
        .optional()
        .describe('Include locked layers when listing editable layers')
    })
  )
  .output(
    z.object({
      templateId: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      thumbnail: z.string().optional(),
      layersCount: z.number().optional(),
      folderId: z.string().nullable().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      layers: z.any().optional(),
      pages: z.any().optional(),
      editableLayers: z
        .array(
          z.object({
            layerName: z.string().optional(),
            layerType: z.string().optional(),
            description: z.string().optional(),
            group: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let [template, editableLayers] = await Promise.all([
      client.getTemplate(ctx.input.templateId, {
        includeLayers: ctx.input.includeLayers,
        includePages: ctx.input.includePages
      }),
      client.getTemplateLayers(ctx.input.templateId, ctx.input.includeLockedLayers)
    ]);

    let layers = Array.isArray(editableLayers) ? editableLayers : [];

    return {
      output: {
        templateId: template.id,
        name: template.name,
        description: template.description,
        width: template.width,
        height: template.height,
        thumbnail: template.thumbnail,
        layersCount: template.layersCount,
        folderId: template.folderId,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        layers: template.layers,
        pages: template.pages,
        editableLayers: layers.map((l: any) => ({
          layerName: l.layer,
          layerType: l.type,
          description: l.description,
          group: l.group
        }))
      },
      message: `Template **${template.name}** (${template.width}x${template.height}) with **${layers.length}** editable layer(s).`
    };
  })
  .build();
