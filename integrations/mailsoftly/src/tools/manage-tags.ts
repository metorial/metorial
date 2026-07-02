import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Retrieve all tags for the firm or assign tags to a contact.
- Omit **contactId** to list all available tags.
- Provide **contactId** with a single tag (**tagId** or **tagName**) to assign one tag.
- Provide **contactId** with a **tags** array to assign multiple tags at once.`,
  instructions: [
    'When assigning a single tag, provide either tagId or tagName (not both).',
    'When assigning multiple tags, use the tags array with tagName and optional tagColor.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('ID of the contact to assign tags to. Omit to list all tags.'),
      tagId: z
        .string()
        .optional()
        .describe('ID of a single tag to assign (alternative to tagName).'),
      tagName: z
        .string()
        .optional()
        .describe('Name of a single tag to assign or create (alternative to tagId).'),
      tagsToAssign: z
        .array(
          z.object({
            tagName: z.string().describe('Name of the tag.'),
            tagColor: z.string().optional().describe('Color of the tag (e.g., hex code).')
          })
        )
        .optional()
        .describe('Array of tags to assign to the contact in bulk.')
    })
  )
  .output(
    z.object({
      availableTags: z.array(z.any()).optional().describe('List of all tags (when listing).'),
      result: z.any().optional().describe('Result of the tag assignment operation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    if (!ctx.input.contactId) {
      let availableTags = await client.getTags();
      return {
        output: { availableTags },
        message: `Retrieved **${availableTags.length}** tag(s).`
      };
    }

    if (ctx.input.tagsToAssign && ctx.input.tagsToAssign.length > 0) {
      let result = await client.assignTagsToContact(
        ctx.input.contactId,
        ctx.input.tagsToAssign
      );
      return {
        output: { result },
        message: `Assigned **${ctx.input.tagsToAssign.length}** tag(s) to contact **${ctx.input.contactId}**.`
      };
    }

    if (ctx.input.tagId || ctx.input.tagName) {
      let result = await client.assignTagToContact(ctx.input.contactId, {
        tagId: ctx.input.tagId,
        tagName: ctx.input.tagName
      });
      return {
        output: { result },
        message: `Assigned tag **${ctx.input.tagName ?? ctx.input.tagId}** to contact **${ctx.input.contactId}**.`
      };
    }

    let availableTags = await client.getTags();
    return {
      output: { availableTags },
      message: `Retrieved **${availableTags.length}** tag(s).`
    };
  })
  .build();
