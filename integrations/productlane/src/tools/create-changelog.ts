import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createChangelog = SlateTool.create(spec, {
  name: 'Create Changelog',
  key: 'create_changelog',
  description: `Create a new changelog entry. Changelogs share product updates with users. Content supports Markdown formatting. Entries are created as drafts by default.`
})
  .input(
    z.object({
      title: z.string().describe('Changelog title'),
      content: z.string().describe('Changelog content in Markdown format'),
      date: z.string().optional().describe('Changelog date (ISO 8601)'),
      published: z
        .boolean()
        .optional()
        .describe('Publish immediately (defaults to false/draft)'),
      language: z.string().optional().describe('Language code')
    })
  )
  .output(
    z.object({
      changelogId: z.string().describe('ID of the created changelog'),
      title: z.string().describe('Changelog title'),
      published: z.boolean().describe('Whether the changelog is published'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createChangelog(ctx.input);

    return {
      output: {
        changelogId: result.id,
        title: result.title,
        published: result.published ?? false,
        createdAt: result.createdAt
      },
      message: `Created changelog **${result.title}** (${result.published ? 'published' : 'draft'}).`
    };
  })
  .build();
