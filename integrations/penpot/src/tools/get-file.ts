import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pageInfoSchema = z.object({
  pageId: z.string().describe('Unique ID of the page'),
  name: z.string().describe('Name of the page')
});

export let getFileTool = SlateTool.create(spec, {
  name: 'Get File',
  key: 'get_file',
  description: `Retrieve detailed information about a design file, including its pages, component summary, and metadata. For full file data with all shapes, use the **includeData** flag.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to retrieve'),
      includeData: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, returns the full file data including all page shapes. Can be large for complex files.'
        )
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Unique ID of the file'),
      name: z.string().describe('Name of the file'),
      projectId: z.string().optional().describe('ID of the project this file belongs to'),
      createdAt: z.string().optional().describe('When the file was created'),
      modifiedAt: z.string().optional().describe('When the file was last modified'),
      revn: z.number().optional().describe('Current revision number'),
      vern: z.number().optional().describe('Current version number'),
      isShared: z.boolean().optional().describe('Whether the file is a shared library'),
      pages: z.array(pageInfoSchema).optional().describe('Pages in the file'),
      componentsCount: z.number().optional().describe('Number of components in the file'),
      colorsCount: z.number().optional().describe('Number of colors in the file'),
      typographiesCount: z.number().optional().describe('Number of typographies in the file'),
      fileData: z.any().optional().describe('Full file data (only when includeData is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let { fileId, includeData } = ctx.input;

    let file = await client.getFile(fileId);

    let pagesOrder: string[] = file.data?.['pages-index'] ?? file.data?.pagesIndex ?? [];
    let pagesMap = file.data?.pages ?? {};

    let pages: Array<{ pageId: string; name: string }> = [];
    if (Array.isArray(pagesOrder)) {
      pages = pagesOrder.map((pid: string) => {
        let page = pagesMap[pid];
        return {
          pageId: pid,
          name: page?.name ?? 'Unnamed'
        };
      });
    }

    let componentsCount = 0;
    let colorsCount = 0;
    let typographiesCount = 0;
    if (file.data) {
      let components = file.data.components ?? {};
      componentsCount = Object.keys(components).length;
      let colors = file.data.colors ?? {};
      colorsCount = Object.keys(colors).length;
      let typographies = file.data.typographies ?? {};
      typographiesCount = Object.keys(typographies).length;
    }

    return {
      output: {
        fileId: file.id,
        name: file.name,
        projectId: file['project-id'] ?? file.projectId,
        createdAt: file['created-at'] ?? file.createdAt,
        modifiedAt: file['modified-at'] ?? file.modifiedAt,
        revn: file.revn,
        vern: file.vern,
        isShared: file['is-shared'] ?? file.isShared,
        pages,
        componentsCount,
        colorsCount,
        typographiesCount,
        fileData: includeData ? file.data : undefined
      },
      message: `Retrieved file **${file.name}** with **${pages.length}** page(s), **${componentsCount}** component(s).`
    };
  })
  .build();
