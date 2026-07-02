import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Lists and searches DocuSign templates available in the account. Returns template details including name, description, and recipient roles. Use search to find specific templates by name or keyword.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchText: z.string().optional().describe('Text to search for in template names'),
      count: z.number().optional().default(25).describe('Number of templates to return'),
      startPosition: z.number().optional().describe('Starting position for pagination'),
      order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort direction'),
      orderBy: z.string().optional().describe('Field to sort by (e.g., "name", "modified")'),
      sharedByMe: z
        .boolean()
        .optional()
        .describe('Filter to templates shared by the current user')
    })
  )
  .output(
    z.object({
      totalSetSize: z
        .string()
        .optional()
        .describe('Total number of templates matching the query'),
      resultSetSize: z.string().optional().describe('Number of templates in this response'),
      startPosition: z.string().optional().describe('Starting position of this result set'),
      nextUri: z.string().optional().describe('URI for the next page of results'),
      templates: z
        .array(
          z.object({
            templateId: z.string(),
            name: z.string(),
            description: z.string().optional(),
            lastModified: z.string().optional(),
            createdDateTime: z.string().optional(),
            shared: z.string().optional(),
            folderId: z.string().optional(),
            folderName: z.string().optional(),
            ownerName: z.string().optional()
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let result = await client.listTemplates({
      searchText: ctx.input.searchText,
      count: ctx.input.count?.toString(),
      startPosition: ctx.input.startPosition?.toString(),
      order: ctx.input.order,
      orderBy: ctx.input.orderBy,
      sharedByMe: ctx.input.sharedByMe ? 'true' : undefined
    });

    let templates = (result.envelopeTemplates || []).map((t: any) => ({
      templateId: t.templateId,
      name: t.name,
      description: t.description,
      lastModified: t.lastModified,
      createdDateTime: t.createdDateTime,
      shared: t.shared,
      folderId: t.folderId,
      folderName: t.folderName,
      ownerName: t.owner?.userName
    }));

    return {
      output: {
        totalSetSize: result.totalSetSize,
        resultSetSize: result.resultSetSize,
        startPosition: result.startPosition,
        nextUri: result.nextUri,
        templates
      },
      message: `Found **${templates.length}** template(s)${ctx.input.searchText ? ` matching "${ctx.input.searchText}"` : ''}.`
    };
  })
  .build();
