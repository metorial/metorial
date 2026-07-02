import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConveyorClient } from '../lib/client';
import { spec } from '../spec';

let folderSchema = z.object({
  folderId: z.string().describe('Unique ID of the folder'),
  name: z.string().describe('Display name of the folder'),
  dataroomId: z.string().describe('ID of the associated dataroom'),
  documentIds: z.array(z.string()).describe('IDs of documents in this folder'),
  createdAt: z.string().describe('When the folder was created'),
  updatedAt: z.string().describe('When the folder was last updated')
});

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `Retrieve all folders in your Trust Center. Folders organize documents and can be used when uploading or updating documents.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      folders: z.array(folderSchema).describe('List of folders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let data = await client.listFolders();
    let folders = (data?._embedded?.folders || []).map((f: any) => ({
      folderId: f.id,
      name: f.name,
      dataroomId: f.dataroom_id,
      documentIds: f.document_ids || [],
      createdAt: f.created_at,
      updatedAt: f.updated_at
    }));

    return {
      output: { folders },
      message: `Found **${folders.length}** folders.`
    };
  })
  .build();

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder in your Trust Center to organize documents. Returns the created folder with its ID, which can be used when uploading documents.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the new folder')
    })
  )
  .output(folderSchema)
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });

    let f = await client.createFolder(ctx.input.name);

    return {
      output: {
        folderId: f.id,
        name: f.name,
        dataroomId: f.dataroom_id,
        documentIds: f.document_ids || [],
        createdAt: f.created_at,
        updatedAt: f.updated_at
      },
      message: `Folder **"${f.name}"** created with ID \`${f.id}\`.`
    };
  })
  .build();

export let deleteFolder = SlateTool.create(spec, {
  name: 'Delete Folder',
  key: 'delete_folder',
  description: `Delete a folder from your Trust Center. This removes the folder but does not delete the documents within it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      folderId: z.string().describe('ID of the folder to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the folder was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConveyorClient({ token: ctx.auth.token });
    await client.deleteFolder(ctx.input.folderId);

    return {
      output: { deleted: true },
      message: `Folder \`${ctx.input.folderId}\` has been **deleted**.`
    };
  })
  .build();
