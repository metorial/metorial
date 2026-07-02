import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteElement = SlateTool.create(spec, {
  name: 'Delete Element',
  key: 'delete_element',
  description: `Deletes a page element (shape, text box, image, chart, etc.) from a slide by its object ID. Use Get Presentation to find element IDs first.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.deleteElement)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      elementObjectId: z.string().describe('Object ID of the element to delete')
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      elementObjectId: z.string().describe('Object ID of the deleted element')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);

    await client.deleteObject(ctx.input.presentationId, ctx.input.elementObjectId);

    return {
      output: {
        presentationId: ctx.input.presentationId,
        elementObjectId: ctx.input.elementObjectId
      },
      message: `Deleted element \`${ctx.input.elementObjectId}\` from presentation.`
    };
  })
  .build();
