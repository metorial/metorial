import { SlateTool } from 'slates';
import { z } from 'zod';
import { SharePointClient } from '../lib/client';
import { spec } from '../spec';

let contentTypeSchema = z.object({
  contentTypeId: z.string().describe('Content type ID'),
  contentTypeName: z.string().describe('Name of the content type'),
  contentTypeDescription: z.string().optional().describe('Description'),
  group: z.string().optional().describe('Content type group'),
  hidden: z.boolean().optional().describe('Whether the content type is hidden'),
  readOnly: z.boolean().optional().describe('Whether the content type is read-only'),
  parentId: z.string().optional().describe('Parent content type ID')
});

let siteColumnSchema = z.object({
  columnId: z.string().describe('Column ID'),
  columnName: z.string().describe('Internal name'),
  displayName: z.string().describe('Display name'),
  columnDescription: z.string().optional().describe('Column description'),
  columnGroup: z.string().optional().describe('Column group'),
  readOnly: z.boolean().optional().describe('Whether the column is read-only'),
  hidden: z.boolean().optional().describe('Whether the column is hidden')
});

export let getContentTypes = SlateTool.create(spec, {
  name: 'Get Content Types',
  key: 'get_content_types',
  description: `Retrieve content types and site columns for a SharePoint site. Content types define reusable schemas for lists and libraries. Site columns are reusable field definitions that can be added to content types and lists.`,
  instructions: [
    'Set **resource** to "contentTypes" to list content types, or "siteColumns" to list site columns.',
    'Provide **contentTypeId** to get details of a specific content type.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      siteId: z.string().describe('SharePoint site ID'),
      resource: z.enum(['contentTypes', 'siteColumns']).describe('Which resource to retrieve'),
      contentTypeId: z
        .string()
        .optional()
        .describe('Specific content type ID (for getting a single content type)')
    })
  )
  .output(
    z.object({
      contentTypes: z.array(contentTypeSchema).optional().describe('List of content types'),
      contentType: contentTypeSchema.optional().describe('Single content type details'),
      siteColumns: z.array(siteColumnSchema).optional().describe('List of site columns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SharePointClient(ctx.auth.token);
    let { siteId, resource, contentTypeId } = ctx.input;

    if (resource === 'contentTypes') {
      if (contentTypeId) {
        let ct = await client.getContentType(siteId, contentTypeId);
        let mapped = {
          contentTypeId: ct.id,
          contentTypeName: ct.name,
          contentTypeDescription: ct.description,
          group: ct.group,
          hidden: ct.hidden,
          readOnly: ct.readOnly,
          parentId: ct.parentId
        };
        return {
          output: { contentType: mapped },
          message: `Retrieved content type **${ct.name}**.`
        };
      }

      let data = await client.listContentTypes(siteId);
      let contentTypes = (data.value || []).map((ct: any) => ({
        contentTypeId: ct.id,
        contentTypeName: ct.name,
        contentTypeDescription: ct.description,
        group: ct.group,
        hidden: ct.hidden,
        readOnly: ct.readOnly,
        parentId: ct.parentId
      }));
      return {
        output: { contentTypes },
        message: `Found **${contentTypes.length}** content type(s).`
      };
    }

    let data = await client.listSiteColumns(siteId);
    let siteColumns = (data.value || []).map((col: any) => ({
      columnId: col.id,
      columnName: col.name,
      displayName: col.displayName || col.name,
      columnDescription: col.description,
      columnGroup: col.columnGroup,
      readOnly: col.readOnly,
      hidden: col.hidden
    }));
    return {
      output: { siteColumns },
      message: `Found **${siteColumns.length}** site column(s).`
    };
  })
  .build();
