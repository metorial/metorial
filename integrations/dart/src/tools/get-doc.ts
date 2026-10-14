import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { docSchema } from '../lib/types';
import { spec } from '../spec';

export let getDoc = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_doc',
  description:
    'Retrieves a Dart document by ID, including its full markdown content, title, folder, and link. Use list_docs to find document IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      docId: z.string().describe('Document ID from list_docs')
    })
  )
  .output(docSchema)
  .handleInvocation(async ctx => {
    let document = await new Client({ token: ctx.auth.token }).getDoc(ctx.input.docId);
    return {
      output: document,
      message: `Retrieved document **${document.title}**. [View document](${document.htmlUrl})`
    };
  })
  .build();
