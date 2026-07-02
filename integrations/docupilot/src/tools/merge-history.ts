import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMergeHistory = SlateTool.create(spec, {
  name: 'List Document History',
  key: 'list_merge_history',
  description: `List the history of generated documents (merge history). Filter by template, status, or date range. Use this to track document generation activity and find previously generated documents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.number().optional().describe('Filter by template ID'),
      status: z
        .enum(['success', 'error', 'pending'])
        .optional()
        .describe('Filter by generation status'),
      startDate: z
        .string()
        .optional()
        .describe('Start date filter (format: YYYY-MM-DD HH:mm:ss)'),
      endDate: z.string().optional().describe('End date filter (format: YYYY-MM-DD HH:mm:ss)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of history entries'),
      entries: z.array(
        z.object({
          historyId: z.number().describe('Unique merge history ID'),
          templateId: z.number().describe('Template used for generation'),
          templateTitle: z.string().optional().describe('Template title'),
          status: z.string().describe('Generation status (success, error, pending)'),
          createdTime: z.string().describe('When the document was generated'),
          fileUrl: z.string().optional().describe('Download URL for the generated document'),
          fileName: z.string().optional().describe('Generated file name')
        })
      ),
      hasMore: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.listMergeHistory({
      template: ctx.input.templateId,
      status: ctx.input.status,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      page: ctx.input.page,
      ordering: '-created_time'
    });

    let entries = result.results.map(h => ({
      historyId: h.id,
      templateId: h.template,
      templateTitle: h.template_title,
      status: h.status,
      createdTime: h.created_time,
      fileUrl: h.file_url,
      fileName: h.file_name
    }));

    return {
      output: {
        totalCount: result.count,
        entries,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** document generation record(s). Showing ${entries.length} results.`
    };
  })
  .build();
