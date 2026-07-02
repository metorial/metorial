import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let classifyDocument = SlateTool.create(spec, {
  name: 'Classify Document',
  key: 'classify_document',
  description: `Classify or identify a document based on its file content. Returns the document class name which can be used for routing and applying appropriate processing templates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded document file content'),
      fileName: z.string().optional().describe('Document file name')
    })
  )
  .output(
    z.object({
      className: z.string().describe('Identified document class/category')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.classifyDocument({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName
    });

    return {
      output: { className: result.className },
      message: `Document classified as: **${result.className}**`
    };
  })
  .build();
