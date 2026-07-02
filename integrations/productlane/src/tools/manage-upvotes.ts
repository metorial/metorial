import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUpvote = SlateTool.create(spec, {
  name: 'Create Upvote',
  key: 'create_upvote',
  description: `Upvote a project or issue on the portal on behalf of a user. Requires the voter's email and either a project or issue ID. This is a public action and does not require authentication.`,
  instructions: ['At least one of projectId or issueId must be provided.']
})
  .input(
    z.object({
      email: z.string().describe('Email address of the voter'),
      projectId: z.string().optional().describe('Project ID to upvote'),
      issueId: z.string().optional().describe('Issue ID to upvote')
    })
  )
  .output(
    z.object({
      upvoteId: z.string().describe('ID of the created upvote'),
      contactId: z.string().describe('ID of the contact who upvoted'),
      projectId: z.string().nullable().describe('Upvoted project ID'),
      issueId: z.string().nullable().describe('Upvoted issue ID'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createUpvote({
      email: ctx.input.email,
      projectId: ctx.input.projectId,
      issueId: ctx.input.issueId
    });

    return {
      output: {
        upvoteId: result.id,
        contactId: result.contactId,
        projectId: result.projectId ?? null,
        issueId: result.issueId ?? null,
        createdAt: result.createdAt
      },
      message: `Created upvote for ${ctx.input.projectId ? `project ${ctx.input.projectId}` : `issue ${ctx.input.issueId}`} by ${ctx.input.email}.`
    };
  })
  .build();

export let listUpvotes = SlateTool.create(spec, {
  name: 'List Upvotes',
  key: 'list_upvotes',
  description: `List all upvotes in your workspace. Returns upvotes with their associated contact, project, and issue references.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      skip: z.number().optional().describe('Number of records to skip'),
      take: z.number().optional().describe('Number of records to return')
    })
  )
  .output(
    z.object({
      upvotes: z
        .array(
          z.object({
            upvoteId: z.string().describe('Upvote ID'),
            contactId: z.string().describe('Contact ID'),
            projectId: z.string().nullable().describe('Upvoted project ID'),
            issueId: z.string().nullable().describe('Upvoted issue ID'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of upvotes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getUpvotes({
      skip: ctx.input.skip,
      take: ctx.input.take
    });

    let upvotes = (Array.isArray(result) ? result : result.upvotes || []).map((u: any) => ({
      upvoteId: u.id,
      contactId: u.contactId,
      projectId: u.projectId ?? null,
      issueId: u.issueId ?? null,
      createdAt: u.createdAt
    }));

    return {
      output: { upvotes },
      message: `Found **${upvotes.length}** upvotes.`
    };
  })
  .build();

export let deleteUpvote = SlateTool.create(spec, {
  name: 'Delete Upvote',
  key: 'delete_upvote',
  description: `Remove an upvote from a project or issue.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      upvoteId: z.string().describe('ID of the upvote to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteUpvote(ctx.input.upvoteId);

    return {
      output: { success: true },
      message: `Deleted upvote ${ctx.input.upvoteId}.`
    };
  })
  .build();
