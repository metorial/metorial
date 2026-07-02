import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFileInfo = SlateTool.create(spec, {
  name: 'Get File Info',
  key: 'get_file_info',
  description: `Retrieve detailed information about a file in Box, including its name, size, owner, timestamps, parent folder, shared links, and version history.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      fileId: z.string().describe('The unique ID of the Box file'),
      includeVersions: z
        .boolean()
        .optional()
        .describe('Whether to also retrieve file version history')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('The unique ID of the file'),
      name: z.string().describe('Name of the file'),
      size: z.number().optional().describe('File size in bytes'),
      type: z.string().describe('Item type (file)'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
      modifiedAt: z.string().optional().describe('ISO 8601 last modification timestamp'),
      description: z.string().optional().describe('File description'),
      parentFolderId: z.string().optional().describe('ID of the parent folder'),
      parentFolderName: z.string().optional().describe('Name of the parent folder'),
      ownedBy: z
        .object({
          userId: z.string(),
          name: z.string(),
          login: z.string()
        })
        .optional()
        .describe('File owner information'),
      sharedLink: z
        .object({
          url: z.string(),
          access: z.string().optional()
        })
        .optional()
        .nullable()
        .describe('Shared link details if set'),
      versions: z
        .array(
          z.object({
            versionId: z.string(),
            name: z.string().optional(),
            size: z.number().optional(),
            createdAt: z.string().optional(),
            modifiedBy: z.string().optional()
          })
        )
        .optional()
        .describe('Version history entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let file = await client.getFileInfo(ctx.input.fileId, [
      'id',
      'name',
      'size',
      'type',
      'created_at',
      'modified_at',
      'description',
      'parent',
      'owned_by',
      'shared_link'
    ]);

    let versions: any[] | undefined;
    if (ctx.input.includeVersions) {
      let rawVersions = await client.getFileVersions(ctx.input.fileId);
      versions = rawVersions.map((v: any) => ({
        versionId: v.id,
        name: v.name,
        size: v.size,
        createdAt: v.created_at,
        modifiedBy: v.modified_by?.name || v.modified_by?.login
      }));
    }

    return {
      output: {
        fileId: file.id,
        name: file.name,
        size: file.size,
        type: file.type,
        createdAt: file.created_at,
        modifiedAt: file.modified_at,
        description: file.description,
        parentFolderId: file.parent?.id,
        parentFolderName: file.parent?.name,
        ownedBy: file.owned_by
          ? {
              userId: file.owned_by.id,
              name: file.owned_by.name,
              login: file.owned_by.login
            }
          : undefined,
        sharedLink: file.shared_link
          ? {
              url: file.shared_link.url,
              access: file.shared_link.access
            }
          : null,
        versions
      },
      message: `Retrieved info for file **${file.name}** (${file.id})${versions ? ` with ${versions.length} version(s)` : ''}.`
    };
  });
