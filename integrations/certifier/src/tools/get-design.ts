import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDesign = SlateTool.create(spec, {
  name: 'Get Design',
  key: 'get_design',
  description: `Retrieve a specific certificate or badge design by its ID. Returns the design's name, type, and preview URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      designId: z.string().describe('ID of the design to retrieve')
    })
  )
  .output(
    z.object({
      designId: z.string().describe('ID of the design'),
      name: z.string().describe('Name of the design'),
      type: z.string().describe('Type of design (e.g. certificate, badge)'),
      previewUrl: z.string().describe('URL to the design preview image'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let design = await client.getDesign(ctx.input.designId);

    return {
      output: {
        designId: design.id,
        name: design.name,
        type: design.type,
        previewUrl: design.previewUrl,
        createdAt: design.createdAt,
        updatedAt: design.updatedAt
      },
      message: `Design **${design.name}** (${design.type}) — preview: ${design.previewUrl}`
    };
  })
  .build();
