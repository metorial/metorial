import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocTool = SlateTool.create(spec, {
  name: 'Get Doc',
  key: 'get_doc',
  description: `Retrieve detailed metadata for a specific Coda doc, including its title, owner, workspace, folder, creation/update timestamps, and publishing status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc to retrieve')
    })
  )
  .output(
    z.object({
      docId: z.string().describe('Unique ID of the doc'),
      name: z.string().describe('Title of the doc'),
      ownerName: z.string().optional().describe('Name of the doc owner'),
      createdAt: z.string().optional().describe('When the doc was created'),
      updatedAt: z.string().optional().describe('When the doc was last updated'),
      workspaceId: z.string().optional().describe('ID of the workspace'),
      folderId: z.string().optional().describe('ID of the folder'),
      browserLink: z.string().optional().describe('URL to open the doc'),
      published: z.boolean().optional().describe('Whether the doc is published')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let doc = await client.getDoc(ctx.input.docId);

    return {
      output: {
        docId: doc.id,
        name: doc.name,
        ownerName: doc.ownerName ?? doc.owner,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        workspaceId: doc.workspace?.id,
        folderId: doc.folder?.id,
        browserLink: doc.browserLink,
        published: !!doc.published?.browserLink
      },
      message: `Retrieved doc **${doc.name}** (${doc.id}).`
    };
  })
  .build();
