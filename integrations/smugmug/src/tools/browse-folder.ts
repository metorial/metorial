import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let browseFolderTool = SlateTool.create(spec, {
  name: 'Browse Folder',
  key: 'browse_folder',
  description: `Browse a SmugMug user's folder structure by path. Returns folder details and its contents (sub-folders, albums, pages). Use this to navigate the content hierarchy starting from the root.`,
  instructions: [
    'Omit folderPath or leave it empty to browse the root folder.',
    'Use folder path segments separated by "/" (e.g., "Travel/Europe").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      nickname: z.string().describe('SmugMug user nickname'),
      folderPath: z
        .string()
        .optional()
        .describe(
          'Folder path relative to root (e.g., "Travel/Europe"). Leave empty for root folder.'
        )
    })
  )
  .output(
    z.object({
      name: z.string().optional().describe('Folder name'),
      urlName: z.string().optional().describe('URL slug'),
      description: z.string().optional().describe('Folder description'),
      webUri: z.string().optional().describe('Web URL'),
      privacy: z.string().optional().describe('Privacy setting'),
      nodeId: z.string().optional().describe('Associated node ID'),
      dateAdded: z.string().optional().describe('Date added'),
      dateModified: z.string().optional().describe('Date modified')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let folder: any;
    if (ctx.input.folderPath) {
      folder = await client.getFolder(ctx.input.nickname, ctx.input.folderPath);
    } else {
      folder = await client.getRootFolder(ctx.input.nickname);
    }

    let nodeId: string | undefined;
    if (folder?.Uris?.Node?.Uri) {
      let nodeParts = (folder.Uris.Node.Uri as string).split('/');
      nodeId = nodeParts[nodeParts.length - 1];
    }

    return {
      output: {
        name: folder?.Name || undefined,
        urlName: folder?.UrlName || undefined,
        description: folder?.Description || undefined,
        webUri: folder?.WebUri || undefined,
        privacy: folder?.Privacy || undefined,
        nodeId,
        dateAdded: folder?.DateAdded || undefined,
        dateModified: folder?.DateModified || undefined
      },
      message: `Browsed folder **${ctx.input.folderPath || '(root)'}** for user **${ctx.input.nickname}**`
    };
  })
  .build();
