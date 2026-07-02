import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateChangelog = SlateTool.create(spec, {
  name: 'Update Changelog',
  key: 'update_changelog',
  description: `Update an existing changelog entry. You can modify the title, content, date, published status, or archive it. Only provided fields will be updated.`
})
  .input(
    z.object({
      changelogId: z.string().describe('ID of the changelog to update'),
      title: z.string().optional().describe('Updated title'),
      content: z.string().optional().describe('Updated Markdown content'),
      date: z.string().optional().describe('Updated date (ISO 8601)'),
      published: z.boolean().optional().describe('Publish or unpublish'),
      archived: z.boolean().optional().describe('Archive or unarchive')
    })
  )
  .output(
    z.object({
      changelogId: z.string().describe('ID of the updated changelog'),
      title: z.string().describe('Changelog title'),
      published: z.boolean().describe('Published status'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let { changelogId, ...updateData } = ctx.input;
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateChangelog(changelogId, updateData);

    return {
      output: {
        changelogId: result.id,
        title: result.title,
        published: result.published ?? false,
        updatedAt: result.updatedAt
      },
      message: `Updated changelog **${result.title}**.`
    };
  })
  .build();
