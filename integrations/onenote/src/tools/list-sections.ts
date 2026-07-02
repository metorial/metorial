import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSections = SlateTool.create(spec, {
  name: 'List Sections',
  key: 'list_sections',
  description: `List all sections within a OneNote notebook. Supports filtering, sorting, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      notebookId: z.string().describe('The ID of the notebook to list sections from'),
      filter: z.string().optional().describe('OData filter expression'),
      orderBy: z.string().optional().describe('OData orderby expression'),
      top: z.number().optional().describe('Maximum number of sections to return'),
      skip: z.number().optional().describe('Number of sections to skip for pagination')
    })
  )
  .output(
    z.object({
      sections: z.array(
        z.object({
          sectionId: z.string(),
          displayName: z.string(),
          createdDateTime: z.string(),
          lastModifiedDateTime: z.string(),
          isDefault: z.boolean(),
          parentNotebookId: z.string().optional(),
          parentSectionGroupId: z.string().optional()
        })
      ),
      nextLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSections(ctx.input.notebookId, {
      filter: ctx.input.filter,
      orderBy: ctx.input.orderBy,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    return {
      output: {
        sections: result.sections.map(s => ({
          sectionId: s.sectionId,
          displayName: s.displayName,
          createdDateTime: s.createdDateTime,
          lastModifiedDateTime: s.lastModifiedDateTime,
          isDefault: s.isDefault,
          parentNotebookId: s.parentNotebookId,
          parentSectionGroupId: s.parentSectionGroupId
        })),
        nextLink: result.nextLink
      },
      message: `Found **${result.sections.length}** section(s).`
    };
  })
  .build();
