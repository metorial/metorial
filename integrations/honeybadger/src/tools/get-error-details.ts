import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { spec } from '../spec';

let noticeSchema = z.object({
  noticeId: z.string().describe('Notice ID'),
  message: z.string().optional().describe('Error message for this occurrence'),
  environment: z.string().optional().describe('Environment'),
  createdAt: z.string().optional().describe('When this occurrence was recorded'),
  url: z.string().optional().describe('Request URL'),
  component: z.string().optional().describe('Component'),
  action: z.string().optional().describe('Action'),
  request: z.any().optional().describe('Request details'),
  backtrace: z.any().optional().describe('Stack trace')
});

export let getErrorDetails = SlateTool.create(spec, {
  name: 'Get Error Details',
  key: 'get_error_details',
  description: `Retrieve detailed information about a specific error (fault) including its recent occurrences (notices), comments, and metadata. Provides full context for debugging.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID'),
      faultId: z.string().describe('Fault/Error ID'),
      includeNotices: z
        .boolean()
        .optional()
        .describe('Include recent error occurrences (default: true)'),
      includeComments: z
        .boolean()
        .optional()
        .describe('Include comments on this error (default: false)'),
      noticeLimit: z.number().optional().describe('Max notices to return (max 25)')
    })
  )
  .output(
    z.object({
      faultId: z.number().describe('Fault ID'),
      klass: z.string().optional().describe('Error class name'),
      message: z.string().optional().describe('Error message'),
      component: z.string().optional().describe('Component'),
      action: z.string().optional().describe('Action'),
      environment: z.string().optional().describe('Environment'),
      resolved: z.boolean().optional().describe('Whether resolved'),
      ignored: z.boolean().optional().describe('Whether ignored'),
      noticesCount: z.number().optional().describe('Total occurrences'),
      createdAt: z.string().optional().describe('First seen'),
      lastNoticeAt: z.string().optional().describe('Last occurrence'),
      tags: z.array(z.string()).optional().describe('Tags'),
      assignee: z.any().optional().describe('Assigned user'),
      notices: z.array(noticeSchema).optional().describe('Recent occurrences'),
      comments: z
        .array(
          z.object({
            commentId: z.number().describe('Comment ID'),
            body: z.string().optional().describe('Comment text'),
            author: z.any().optional().describe('Comment author'),
            createdAt: z.string().optional().describe('When the comment was created')
          })
        )
        .optional()
        .describe('Comments on this error'),
      url: z.string().optional().describe('URL to view error in Honeybadger')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
    let { projectId, faultId, includeNotices, includeComments, noticeLimit } = ctx.input;

    let fault = await client.getFault(projectId, faultId);

    let notices: any[] | undefined;
    if (includeNotices !== false) {
      let noticesData = await client.listNotices(projectId, faultId, {
        limit: noticeLimit || 5
      });
      notices = (noticesData.results || []).map((n: any) => ({
        noticeId: n.id,
        message: n.message,
        environment: n.environment,
        createdAt: n.created_at,
        url: n.request?.url,
        component: n.request?.component,
        action: n.request?.action,
        request: n.request,
        backtrace: n.backtrace
      }));
    }

    let comments: any[] | undefined;
    if (includeComments) {
      let commentsData = await client.listComments(projectId, faultId);
      comments = (commentsData.results || []).map((c: any) => ({
        commentId: c.id,
        body: c.body,
        author: c.author,
        createdAt: c.created_at
      }));
    }

    return {
      output: {
        faultId: fault.id,
        klass: fault.klass,
        message: fault.message,
        component: fault.component,
        action: fault.action,
        environment: fault.environment,
        resolved: fault.resolved,
        ignored: fault.ignored,
        noticesCount: fault.notices_count,
        createdAt: fault.created_at,
        lastNoticeAt: fault.last_notice_at,
        tags: fault.tags,
        assignee: fault.assignee,
        notices,
        comments,
        url: fault.url
      },
      message: `Error **${fault.klass}**: "${fault.message}" — ${fault.notices_count} occurrence(s), ${fault.resolved ? 'resolved' : 'unresolved'}.`
    };
  })
  .build();
