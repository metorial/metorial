import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { docSchema } from '../lib/types';
import { spec } from '../spec';

export let updateDoc = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_doc',
  description: `Updates an existing document's title, folder, or content. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the document to update'),
      title: z.string().optional().describe('New document title'),
      folder: z.string().optional().describe('Move to a different folder (by name)'),
      text: z.string().optional().describe('Updated document content in markdown')
    })
  )
  .output(docSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { docId, ...updateParams } = ctx.input;
    let doc = await client.updateDoc(docId, updateParams);

    return {
      output: doc,
      message: `Updated document **${doc.title}** in folder **${doc.folder}**. [View document](${doc.htmlUrl})`
    };
  })
  .build();
