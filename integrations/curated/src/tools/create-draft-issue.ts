import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDraftIssue = SlateTool.create(spec, {
  name: 'Create Draft Issue',
  key: 'create_draft_issue',
  description: `Create a new draft newsletter issue for a publication. The draft is created using the publication's default settings and can then be edited through the Curated web interface.`,
  constraints: [
    'Issues cannot be published via the API; publishing must be done through the Curated web interface.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      publicationId: z.string().describe('ID of the publication to create the draft issue for')
    })
  )
  .output(
    z.object({
      issueId: z.number().describe('Database ID of the new draft issue'),
      issueNumber: z.number().describe('Issue number'),
      title: z.string().describe('Title of the draft issue'),
      summary: z.string().describe('Summary of the draft issue'),
      url: z.string().describe('URL of the draft issue'),
      updatedAt: z.string().describe('ISO 8601 last updated date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let issue = await client.createDraftIssue(ctx.input.publicationId);

    return {
      output: {
        issueId: issue.id,
        issueNumber: issue.number,
        title: issue.title,
        summary: issue.summary,
        url: issue.url,
        updatedAt: issue.updated_at
      },
      message: `Created draft issue **#${issue.number}** (ID: ${issue.id}). Use the Curated web interface to edit and publish it.`
    };
  })
  .build();
