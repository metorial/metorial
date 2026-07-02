import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireExactlyOne } from '../lib/preconditions';
import { spec } from '../spec';

export let createSectionGroup = SlateTool.create(spec, {
  name: 'Create Section Group',
  key: 'create_section_group',
  description: `Create a new section group for organizing sections. Can be created directly in a notebook or nested inside another section group.`,
  instructions: [
    'Provide notebookId to create a section group directly in a notebook.',
    'Provide parentSectionGroupId to create a nested section group.',
    'Exactly one of notebookId or parentSectionGroupId must be provided.'
  ]
})
  .input(
    z.object({
      displayName: z.string().describe('The name for the new section group'),
      notebookId: z.string().optional().describe('The ID of the parent notebook'),
      parentSectionGroupId: z
        .string()
        .optional()
        .describe('The ID of the parent section group for nesting')
    })
  )
  .output(
    z.object({
      sectionGroupId: z.string(),
      displayName: z.string(),
      createdDateTime: z.string(),
      lastModifiedDateTime: z.string(),
      parentNotebookId: z.string().optional(),
      parentSectionGroupId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    requireExactlyOne({
      notebookId: ctx.input.notebookId,
      parentSectionGroupId: ctx.input.parentSectionGroupId
    });

    let sectionGroup: any;
    if (ctx.input.parentSectionGroupId) {
      sectionGroup = await client.createNestedSectionGroup(
        ctx.input.parentSectionGroupId,
        ctx.input.displayName
      );
    } else {
      sectionGroup = await client.createSectionGroup(
        ctx.input.notebookId!,
        ctx.input.displayName
      );
    }

    return {
      output: {
        sectionGroupId: sectionGroup.sectionGroupId,
        displayName: sectionGroup.displayName,
        createdDateTime: sectionGroup.createdDateTime,
        lastModifiedDateTime: sectionGroup.lastModifiedDateTime,
        parentNotebookId: sectionGroup.parentNotebookId,
        parentSectionGroupId: sectionGroup.parentSectionGroupId
      },
      message: `Created section group **${sectionGroup.displayName}** (ID: \`${sectionGroup.sectionGroupId}\`).`
    };
  })
  .build();
