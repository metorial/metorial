import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { docSchema } from '../lib/types';
import { spec } from '../spec';

export let createDoc = SlateTool.create(spec, {
  name: 'Create Document',
  key: 'create_doc',
  description: `Creates a new document in Dart. Documents can serve as wikis, meeting notes, project descriptions, or any other written content. Content supports markdown formatting.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Document title'),
      folder: z.string().optional().describe('Folder name to place the document in'),
      text: z.string().optional().describe('Document content in markdown')
    })
  )
  .output(docSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let doc = await client.createDoc(ctx.input);

    return {
      output: doc,
      message: `Created document **${doc.title}** in folder **${doc.folder}**. [View document](${doc.htmlUrl})`
    };
  })
  .build();
