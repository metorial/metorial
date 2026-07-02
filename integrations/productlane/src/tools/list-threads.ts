import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let threadSummarySchema = z.object({
  threadId: z.string().describe('Unique ID of the thread'),
  title: z.string().nullable().describe('Thread title'),
  text: z.string().describe('Thread body text'),
  painLevel: z.string().describe('Pain level: UNKNOWN, LOW, MEDIUM, or HIGH'),
  state: z.string().describe('Thread state: NEW, PROCESSED, COMPLETED, SNOOZED, or UNSNOOZED'),
  origin: z.string().describe('Source of the thread'),
  contactId: z.string().nullable().describe('Associated contact ID'),
  companyId: z.string().nullable().describe('Associated company ID'),
  assigneeId: z.string().nullable().describe('Assigned workspace member ID'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listThreads = SlateTool.create(spec, {
  name: 'List Threads',
  key: 'list_threads',
  description: `List feedback threads (insights) in your Productlane workspace. Threads represent feedback items or conversations from customers. Supports filtering by state, linked issue, or project.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      state: z
        .enum(['NEW', 'PROCESSED', 'COMPLETED', 'SNOOZED', 'UNSNOOZED'])
        .optional()
        .describe('Filter by thread state'),
      issueId: z.string().optional().describe('Filter by linked Linear issue ID'),
      projectId: z.string().optional().describe('Filter by linked project ID'),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      take: z.number().optional().describe('Number of records to return (max 100)')
    })
  )
  .output(
    z.object({
      threads: z.array(threadSummarySchema).describe('List of threads'),
      hasMore: z.boolean().describe('Whether more results are available'),
      count: z.number().describe('Total count of matching threads')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listThreads({
      state: ctx.input.state,
      issueId: ctx.input.issueId,
      projectId: ctx.input.projectId,
      skip: ctx.input.skip,
      take: ctx.input.take
    });

    let threads = (result.threads || []).map((t: any) => ({
      threadId: t.id,
      title: t.title ?? null,
      text: t.text,
      painLevel: t.painLevel,
      state: t.state,
      origin: t.origin,
      contactId: t.contactId ?? null,
      companyId: t.companyId ?? null,
      assigneeId: t.assigneeId ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: {
        threads,
        hasMore: result.hasMore ?? false,
        count: result.count ?? threads.length
      },
      message: `Found **${result.count ?? threads.length}** threads.${result.hasMore ? ' More results are available.' : ''}`
    };
  })
  .build();
