import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireExactlyOne } from '../lib/preconditions';
import { spec } from '../spec';

export let copyContent = SlateTool.create(spec, {
  name: 'Copy Content',
  key: 'copy_content',
  description: `Copy a OneNote notebook, section, or page to another location. Supports copying across notebooks, section groups, users, groups, and SharePoint sites. The copy operation is asynchronous and returns an operation status.`,
  instructions: [
    'Set resourceType to "notebook", "section", or "page" to specify what to copy.',
    'For pages, provide the destinationSectionId where the page should be copied.',
    'For sections, provide either destinationNotebookId or destinationSectionGroupId.',
    'For notebooks, optionally provide groupId or site details for the destination.',
    'Copying into a Microsoft 365 group or SharePoint site destination requires the Notes.ReadWrite.All scope, which the default consent list no longer includes; such copies fail with a permission error unless that scope was granted.'
  ]
})
  .input(
    z.object({
      resourceType: z
        .enum(['notebook', 'section', 'page'])
        .describe('Type of resource to copy'),
      resourceId: z.string().describe('The ID of the notebook, section, or page to copy'),
      destinationSectionId: z
        .string()
        .optional()
        .describe('Destination section ID (for copying pages)'),
      destinationNotebookId: z
        .string()
        .optional()
        .describe('Destination notebook ID (for copying sections)'),
      destinationSectionGroupId: z
        .string()
        .optional()
        .describe('Destination section group ID (for copying sections)'),
      renameAs: z
        .string()
        .optional()
        .describe('New name for the copied resource (notebooks and sections only)'),
      groupId: z.string().optional().describe('Target Microsoft 365 group ID'),
      siteCollectionId: z.string().optional().describe('Target SharePoint site collection ID'),
      siteId: z.string().optional().describe('Target SharePoint site ID')
    })
  )
  .output(
    z.object({
      operationId: z.string(),
      status: z.string(),
      resourceLocation: z.string().optional(),
      percentComplete: z.string().optional(),
      createdDateTime: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.resourceType === 'page') {
      if (!ctx.input.destinationSectionId) {
        throw new Error('destinationSectionId is required when copying a page.');
      }
      result = await client.copyPageToSection(
        ctx.input.resourceId,
        ctx.input.destinationSectionId,
        ctx.input.groupId,
        ctx.input.siteCollectionId,
        ctx.input.siteId
      );
    } else if (ctx.input.resourceType === 'section') {
      requireExactlyOne(
        {
          destinationNotebookId: ctx.input.destinationNotebookId,
          destinationSectionGroupId: ctx.input.destinationSectionGroupId
        },
        'Provide exactly one of destinationNotebookId or destinationSectionGroupId when copying a section.'
      );

      result = await client.copySection(ctx.input.resourceId, {
        destinationNotebookId: ctx.input.destinationNotebookId,
        destinationSectionGroupId: ctx.input.destinationSectionGroupId,
        renameAs: ctx.input.renameAs,
        siteCollectionId: ctx.input.siteCollectionId,
        siteId: ctx.input.siteId,
        groupId: ctx.input.groupId
      });
    } else {
      result = await client.copyNotebook(ctx.input.resourceId, {
        groupId: ctx.input.groupId,
        renameAs: ctx.input.renameAs,
        siteCollectionId: ctx.input.siteCollectionId,
        siteId: ctx.input.siteId
      });
    }

    return {
      output: result,
      message: `Copy operation started for ${ctx.input.resourceType} \`${ctx.input.resourceId}\`. Status: **${result.status}**.`
    };
  })
  .build();
