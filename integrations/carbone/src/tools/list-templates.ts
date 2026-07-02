import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let templateItemSchema = z.object({
  templateId: z.string().describe('Unique template ID.'),
  versionId: z.string().describe('Version ID (SHA256 hash of the file).'),
  deployedAt: z.number().describe('UTC Unix timestamp of the deployed version.'),
  createdAt: z.number().describe('UTC Unix timestamp of when the template was created.'),
  expireAt: z.number().describe('UTC Unix timestamp of when the template expires.'),
  size: z.number().describe('File size in bytes.'),
  type: z.string().describe('File type (e.g. "docx", "xlsx").'),
  name: z.string().describe('Template name.'),
  category: z.string().describe('Category/folder the template belongs to.'),
  comment: z.string().describe('Comment or description.'),
  tags: z.array(z.string()).describe('List of tags assigned to the template.'),
  origin: z.number().describe('Upload origin: 0 for API, 1 for Studio.')
});

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve a list of templates stored in Carbone. Supports filtering by template ID, version ID, category, origin, and free-text search. Use cursor-based pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().optional().describe('Filter by a specific template ID.'),
      versionId: z.string().optional().describe('Filter by a specific version ID.'),
      category: z.string().optional().describe('Filter by category/folder.'),
      origin: z
        .number()
        .optional()
        .describe('Filter by upload origin: 0 for API uploads, 1 for Studio uploads.'),
      includeVersions: z
        .boolean()
        .optional()
        .describe('Include all versions of each template (default: false).'),
      search: z
        .string()
        .optional()
        .describe('Search templates by name (fuzzy) or by exact ID match.'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of templates to return (default: 100).'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response.')
    })
  )
  .output(
    z.object({
      templates: z.array(templateItemSchema).describe('List of matching templates.'),
      hasMore: z.boolean().describe('Whether more results are available.'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor to fetch the next page of results, or null if no more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      carboneVersion: ctx.config.carboneVersion
    });

    let result = await client.listTemplates({
      templateId: ctx.input.templateId,
      versionId: ctx.input.versionId,
      category: ctx.input.category,
      origin: ctx.input.origin,
      includeVersions: ctx.input.includeVersions,
      search: ctx.input.search,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let count = result.templates.length;
    let moreText = result.hasMore
      ? ` More results available (use cursor: \`${result.nextCursor}\`).`
      : '';
    return {
      output: result,
      message: `Found **${count}** template(s).${moreText}`
    };
  })
  .build();
