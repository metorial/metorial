import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List all folders in your account, optionally filtered by name. Also supports listing templates and renders within a specific folder.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Filter folders by name'),
      page: z.number().optional().describe('Page number (starts at 0)'),
      limit: z.number().optional().describe('Results per page. Default: 25'),
      folderId: z
        .string()
        .optional()
        .describe('If provided, list contents of this folder instead of all folders'),
      contentType: z
        .enum(['templates', 'renders'])
        .optional()
        .describe('When folderId is provided, which content type to list. Default: templates')
    })
  )
  .output(
    z.object({
      folders: z
        .array(
          z.object({
            folderId: z.string().optional(),
            folderName: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      templates: z.array(z.any()).optional(),
      renders: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.folderId) {
      let contentType = ctx.input.contentType || 'templates';
      if (contentType === 'renders') {
        let renders = await client.listFolderRenders(ctx.input.folderId, {
          page: ctx.input.page,
          limit: ctx.input.limit
        });
        let items = Array.isArray(renders) ? renders : [];
        return {
          output: { renders: items },
          message: `Found **${items.length}** render(s) in folder \`${ctx.input.folderId}\`.`
        };
      } else {
        let templates = await client.listFolderTemplates(ctx.input.folderId, {
          query: ctx.input.query,
          page: ctx.input.page,
          limit: ctx.input.limit
        });
        let items = Array.isArray(templates) ? templates : [];
        return {
          output: { templates: items },
          message: `Found **${items.length}** template(s) in folder \`${ctx.input.folderId}\`.`
        };
      }
    }

    let folders = await client.listFolders({
      query: ctx.input.query,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let items = Array.isArray(folders) ? folders : [];

    return {
      output: {
        folders: items.map((f: any) => ({
          folderId: f.id,
          folderName: f.name,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt
        }))
      },
      message: `Found **${items.length}** folder(s).`
    };
  })
  .build();
