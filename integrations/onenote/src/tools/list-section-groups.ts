import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSectionGroups = SlateTool.create(spec, {
  name: 'List Section Groups',
  key: 'list_section_groups',
  description: `List all section groups within a OneNote notebook. Section groups provide an additional level of hierarchy for organizing sections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      notebookId: z.string().describe('The ID of the notebook to list section groups from'),
      filter: z.string().optional().describe('OData filter expression'),
      orderBy: z.string().optional().describe('OData orderby expression'),
      top: z.number().optional().describe('Maximum number of section groups to return'),
      skip: z.number().optional().describe('Number of section groups to skip for pagination')
    })
  )
  .output(
    z.object({
      sectionGroups: z.array(
        z.object({
          sectionGroupId: z.string(),
          displayName: z.string(),
          createdDateTime: z.string(),
          lastModifiedDateTime: z.string(),
          parentNotebookId: z.string().optional(),
          parentSectionGroupId: z.string().optional()
        })
      ),
      nextLink: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSectionGroups(ctx.input.notebookId, {
      filter: ctx.input.filter,
      orderBy: ctx.input.orderBy,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    return {
      output: {
        sectionGroups: result.sectionGroups.map(sg => ({
          sectionGroupId: sg.sectionGroupId,
          displayName: sg.displayName,
          createdDateTime: sg.createdDateTime,
          lastModifiedDateTime: sg.lastModifiedDateTime,
          parentNotebookId: sg.parentNotebookId,
          parentSectionGroupId: sg.parentSectionGroupId
        })),
        nextLink: result.nextLink
      },
      message: `Found **${result.sectionGroups.length}** section group(s).`
    };
  })
  .build();
