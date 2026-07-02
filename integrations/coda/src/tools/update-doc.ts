import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDocTool = SlateTool.create(spec, {
  name: 'Update Doc',
  key: 'update_doc',
  description: `Update the properties of an existing Coda doc, such as its title or icon.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc to update'),
      title: z.string().optional().describe('New title for the doc'),
      iconName: z.string().optional().describe('New icon name for the doc')
    })
  )
  .output(
    z.object({
      docId: z.string().describe('ID of the updated doc'),
      name: z.string().describe('Updated title of the doc')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.updateDoc(ctx.input.docId, {
      title: ctx.input.title,
      iconName: ctx.input.iconName
    });

    return {
      output: {
        docId: result.id,
        name: result.name || ctx.input.title || ''
      },
      message: `Updated doc **${ctx.input.docId}**.`
    };
  })
  .build();
