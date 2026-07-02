import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExcelClient } from '../lib/client';
import { spec } from '../spec';

export let findWorkbooks = SlateTool.create(spec, {
  name: 'Find Workbooks',
  key: 'find_workbooks',
  description: `Search for Excel workbook files (.xlsx) in OneDrive for Business or SharePoint by keyword, or list workbooks in a specific folder. Returns file metadata including the item ID needed for other Excel operations.`,
  instructions: [
    'Use "search" to find workbooks by keyword across the drive.',
    'Use "list" to list Excel files in a specific folder (or the root if no folder is specified).',
    'Use "get" to retrieve metadata for a specific workbook by its item ID.',
    'The returned workbookItemId can be used in all other Excel tools.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['search', 'list', 'get']).describe('Operation to perform'),
      query: z.string().optional().describe('Search keyword (for search action)'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID to list workbooks from (for list action, omit for root)'),
      workbookItemId: z.string().optional().describe('Drive item ID (for get action)')
    })
  )
  .output(
    z.object({
      workbooks: z
        .array(
          z.object({
            workbookItemId: z.string(),
            name: z.string(),
            webUrl: z.string().optional(),
            lastModifiedDateTime: z.string().optional(),
            size: z.number().optional(),
            createdBy: z.string().optional(),
            lastModifiedBy: z.string().optional()
          })
        )
        .optional()
        .describe('List of workbooks found'),
      workbook: z
        .object({
          workbookItemId: z.string(),
          name: z.string(),
          webUrl: z.string().optional(),
          lastModifiedDateTime: z.string().optional(),
          size: z.number().optional(),
          createdBy: z.string().optional(),
          lastModifiedBy: z.string().optional(),
          parentPath: z.string().optional()
        })
        .optional()
        .describe('Workbook file metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExcelClient({
      token: ctx.auth.token,
      driveId: ctx.config.driveId,
      siteId: ctx.config.siteId
    });

    let mapFile = (f: any) => ({
      workbookItemId: f.id,
      name: f.name,
      webUrl: f.webUrl,
      lastModifiedDateTime: f.lastModifiedDateTime,
      size: f.size,
      createdBy: f.createdBy?.user?.displayName,
      lastModifiedBy: f.lastModifiedBy?.user?.displayName
    });

    switch (ctx.input.action) {
      case 'search': {
        if (!ctx.input.query) throw new Error('query is required for search action');
        let files = await client.searchFiles(ctx.input.query);
        let xlsxFiles = files.filter((f: any) => f.name?.endsWith('.xlsx'));
        return {
          output: { workbooks: xlsxFiles.map(mapFile) },
          message: `Found **${xlsxFiles.length}** Excel workbook(s) matching "${ctx.input.query}".`
        };
      }
      case 'list': {
        let files = await client.listChildren(ctx.input.folderId);
        return {
          output: { workbooks: files.map(mapFile) },
          message: `Found **${files.length}** Excel workbook(s) in the folder.`
        };
      }
      case 'get': {
        if (!ctx.input.workbookItemId)
          throw new Error('workbookItemId is required for get action');
        let file = await client.getFileMetadata(ctx.input.workbookItemId);
        return {
          output: {
            workbook: {
              ...mapFile(file),
              parentPath: file.parentReference?.path
            }
          },
          message: `Retrieved metadata for **${file.name}**.`
        };
      }
    }
  })
  .build();
