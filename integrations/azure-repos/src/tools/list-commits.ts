import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCommits = SlateTool.create(spec, {
  name: 'List Commits',
  key: 'list_commits',
  description: `Lists commits in a repository with filtering by branch, author, date range, and file path. Returns commit metadata including author, message, and change counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      branch: z
        .string()
        .optional()
        .describe('Branch name to list commits from (e.g., "main")'),
      author: z.string().optional().describe('Filter by author name or email'),
      fromDate: z.string().optional().describe('Start date (ISO 8601 format)'),
      toDate: z.string().optional().describe('End date (ISO 8601 format)'),
      itemPath: z
        .string()
        .optional()
        .describe('Filter commits affecting a specific file path'),
      top: z.number().optional().describe('Maximum number of commits to return'),
      skip: z.number().optional().describe('Number of commits to skip')
    })
  )
  .output(
    z.object({
      commits: z.array(
        z.object({
          commitId: z.string().describe('Full commit SHA'),
          shortId: z.string().describe('Short commit SHA (first 8 characters)'),
          authorName: z.string().describe('Author name'),
          authorEmail: z.string().describe('Author email'),
          authorDate: z.string().describe('Author date'),
          committerName: z.string().describe('Committer name'),
          committerDate: z.string().describe('Commit date'),
          message: z.string().describe('Commit message'),
          changeCounts: z
            .object({
              add: z.number().describe('Files added'),
              edit: z.number().describe('Files edited'),
              delete: z.number().describe('Files deleted')
            })
            .optional()
            .describe('File change counts'),
          parentIds: z.array(z.string()).optional().describe('Parent commit SHAs')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let commits = await client.listCommits(ctx.input.repositoryId, {
      branch: ctx.input.branch,
      author: ctx.input.author,
      fromDate: ctx.input.fromDate,
      toDate: ctx.input.toDate,
      itemPath: ctx.input.itemPath,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    return {
      output: {
        commits: commits.map(c => ({
          commitId: c.commitId,
          shortId: c.commitId.substring(0, 8),
          authorName: c.author.name,
          authorEmail: c.author.email,
          authorDate: c.author.date,
          committerName: c.committer.name,
          committerDate: c.committer.date,
          message: c.comment,
          changeCounts: c.changeCounts
            ? {
                add: c.changeCounts.Add,
                edit: c.changeCounts.Edit,
                delete: c.changeCounts.Delete
              }
            : undefined,
          parentIds: c.parents
        }))
      },
      message: `Found **${commits.length}** commits.`
    };
  })
  .build();
