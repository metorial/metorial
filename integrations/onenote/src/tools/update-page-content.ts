import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePageContent = SlateTool.create(spec, {
  name: 'Update Page Content',
  key: 'update_page_content',
  description: `Update the content of an existing OneNote page using PATCH operations. Supports appending, replacing, inserting, prepending, and deleting content on specific page elements identified by their element IDs.`,
  instructions: [
    'Use the Get Page tool with includeContent=true to retrieve the page HTML with element IDs first.',
    'The target field should reference a page element by its data-id attribute, e.g. "#my-div" or "body" or "title".',
    'The content field contains HTML to insert/replace/append.'
  ]
})
  .input(
    z.object({
      pageId: z.string().describe('The ID of the page to update'),
      operations: z
        .array(
          z.object({
            target: z
              .string()
              .describe('Target element identifier, e.g. "#element-id", "body", or "title"'),
            action: z
              .enum(['replace', 'append', 'delete', 'insert', 'prepend'])
              .describe('The type of patch operation'),
            content: z
              .string()
              .optional()
              .describe('HTML content for replace, append, insert, or prepend actions'),
            position: z
              .enum(['after', 'before'])
              .optional()
              .describe('Position for insert action relative to the target')
          })
        )
        .describe('List of patch operations to apply')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.updatePageContent(ctx.input.pageId, ctx.input.operations);

    return {
      output: {
        success: true
      },
      message: `Applied **${ctx.input.operations.length}** patch operation(s) to page \`${ctx.input.pageId}\`.`
    };
  })
  .build();
