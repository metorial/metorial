import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIssues = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description: `List newsletter issues for a publication. Filter by published or draft state, include open/click rate statistics, and paginate through results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      publicationId: z.string().describe('ID of the publication'),
      state: z.enum(['published', 'draft']).optional().describe('Filter by issue state'),
      includeStats: z.boolean().optional().describe('Include open and click rate statistics'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 250)')
    })
  )
  .output(
    z.object({
      issues: z.array(
        z.object({
          issueNumber: z.number().describe('Issue number used to retrieve full issue details'),
          title: z.string().describe('Title of the issue'),
          summary: z.string().describe('Summary of the issue'),
          url: z.string().describe('Public URL of the issue'),
          publishedAt: z
            .string()
            .nullable()
            .describe('ISO 8601 publication date, null for drafts'),
          updatedAt: z.string().describe('ISO 8601 last updated date')
        })
      ),
      page: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalResults: z.number().describe('Total number of issues')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listIssues(ctx.input.publicationId, {
      state: ctx.input.state,
      stats: ctx.input.includeStats,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let issueList = response.issues || response.data || [];
    let issues = issueList.map(issue => ({
      issueNumber: issue.number,
      title: issue.title,
      summary: issue.summary,
      url: issue.url,
      publishedAt: issue.published_at,
      updatedAt: issue.updated_at
    }));

    return {
      output: {
        issues,
        page: response.page,
        totalPages: response.total_pages,
        totalResults: response.total_results
      },
      message: `Found **${response.total_results}** issue(s) (page ${response.page}/${response.total_pages}). Showing ${issues.length} issue(s)${ctx.input.state ? ` with state "${ctx.input.state}"` : ''}.`
    };
  })
  .build();
