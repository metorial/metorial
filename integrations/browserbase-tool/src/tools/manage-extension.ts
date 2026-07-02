import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExtension = SlateTool.create(spec, {
  name: 'Get Extension',
  key: 'get_extension',
  description: `Retrieve details about an uploaded Chrome extension including file name and linked project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      extensionId: z.string().describe('The extension ID to retrieve')
    })
  )
  .output(
    z.object({
      extensionId: z.string().describe('Extension identifier'),
      fileName: z.string().describe('Uploaded file name'),
      projectId: z.string().describe('Linked project ID'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let extension = await client.getExtension(ctx.input.extensionId);

    return {
      output: {
        extensionId: extension.extensionId,
        fileName: extension.fileName,
        projectId: extension.projectId,
        createdAt: extension.createdAt,
        updatedAt: extension.updatedAt
      },
      message: `Retrieved extension **${extension.extensionId}** (${extension.fileName}).`
    };
  })
  .build();

export let deleteExtension = SlateTool.create(spec, {
  name: 'Delete Extension',
  key: 'delete_extension',
  description: `Delete an uploaded Chrome extension. The extension will no longer be available for new sessions.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      extensionId: z.string().describe('The extension ID to delete')
    })
  )
  .output(
    z.object({
      extensionId: z.string().describe('Deleted extension ID'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteExtension(ctx.input.extensionId);

    return {
      output: {
        extensionId: ctx.input.extensionId,
        deleted: true
      },
      message: `Deleted extension **${ctx.input.extensionId}**.`
    };
  })
  .build();
