import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireExactlyOne } from '../lib/preconditions';
import { spec } from '../spec';

export let createSection = SlateTool.create(spec, {
  name: 'Create Section',
  key: 'create_section',
  description: `Create a new section inside a OneNote notebook or section group. Provide either a **notebookId** or a **sectionGroupId** to specify the parent container.`,
  instructions: [
    'Provide notebookId to create a section directly in a notebook.',
    'Provide sectionGroupId to create a section inside a section group.',
    'Exactly one of notebookId or sectionGroupId must be provided.'
  ]
})
  .input(
    z.object({
      displayName: z.string().describe('The name for the new section'),
      notebookId: z.string().optional().describe('The ID of the parent notebook'),
      sectionGroupId: z.string().optional().describe('The ID of the parent section group')
    })
  )
  .output(
    z.object({
      sectionId: z.string(),
      displayName: z.string(),
      createdDateTime: z.string(),
      lastModifiedDateTime: z.string(),
      isDefault: z.boolean(),
      parentNotebookId: z.string().optional(),
      parentSectionGroupId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    requireExactlyOne({
      notebookId: ctx.input.notebookId,
      sectionGroupId: ctx.input.sectionGroupId
    });

    let section: any;
    if (ctx.input.sectionGroupId) {
      section = await client.createSectionInGroup(
        ctx.input.sectionGroupId,
        ctx.input.displayName
      );
    } else {
      section = await client.createSection(ctx.input.notebookId!, ctx.input.displayName);
    }

    return {
      output: {
        sectionId: section.sectionId,
        displayName: section.displayName,
        createdDateTime: section.createdDateTime,
        lastModifiedDateTime: section.lastModifiedDateTime,
        isDefault: section.isDefault,
        parentNotebookId: section.parentNotebookId,
        parentSectionGroupId: section.parentSectionGroupId
      },
      message: `Created section **${section.displayName}** (ID: \`${section.sectionId}\`).`
    };
  })
  .build();
