import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import type { Comment, Notice } from '../lib/types';
import { projectIdSchema, validateLimit } from '../lib/validation';
import { spec } from '../spec';

let noticeSchema = z.object({
  noticeId: z.string().describe('Notice ID'),
  message: z.string().optional().describe('Error message for this occurrence'),
  environment: z.string().optional().describe('Environment'),
  createdAt: z.string().optional().describe('When this occurrence was recorded'),
  url: z.string().optional().describe('Request URL'),
  component: z.string().optional().describe('Component'),
  action: z.string().optional().describe('Action'),
  request: z.unknown().optional().describe('Request details'),
  backtrace: z.unknown().optional().describe('Stack trace')
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
      projectId: projectIdSchema,
      faultId: z.string().describe('Fault/Error ID'),
      includeNotices: z
        .boolean()
        .optional()
        .describe('Include recent error occurrences (default: true)'),
      includeComments: z
        .boolean()
        .optional()
        .describe('Include comments on this error (default: false)'),
      noticesNextUrl: z
        .string()
        .optional()
        .describe('Next notices-page URL from the preceding response'),
      commentsNextUrl: z
        .string()
        .optional()
        .describe('Next comments-page URL from the preceding response'),
      noticeLimit: z.number().optional().describe('Max notices to return (max 25)')
    })
  )
  .output(
    z.object({
      noticesNextUrl: z.string().optional().describe('Next notices-page URL'),
      commentsNextUrl: z.string().optional().describe('Next comments-page URL'),
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
      assignee: z.unknown().optional().describe('Assigned user'),
      notices: z.array(noticeSchema).optional().describe('Recent occurrences'),
      comments: z
        .array(
          z.object({
            commentId: z.number().describe('Comment ID'),
            body: z.string().optional().describe('Comment text'),
            author: z.unknown().optional().describe('Comment author'),
            createdAt: z.string().optional().describe('When the comment was created')
          })
        )
        .optional()
        .describe('Comments on this error'),
      url: z.string().optional().describe('URL to view error in Honeybadger')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
    let { projectId, faultId, includeNotices, includeComments, noticeLimit } = ctx.input;

    validateLimit(noticeLimit);
    let fault = await client.getFault(projectId, faultId);
    let notices: z.infer<typeof noticeSchema>[] | undefined;
    let noticesNextUrl: string | undefined;
    let commentsNextUrl: string | undefined;
    if (includeNotices !== false) {
      let noticesData = await client.listNotices(projectId, faultId, {
        limit: noticeLimit ?? 5,
        nextUrl: ctx.input.noticesNextUrl
      });
      noticesNextUrl = noticesData.links?.next ?? undefined;
      notices = (noticesData.results || []).map((n: Notice) => ({
        noticeId: n.id ?? undefined,
        message: n.message ?? undefined,
        environment:
          typeof n.environment === 'string' ? n.environment : n.environment?.environment_name,
        createdAt: n.created_at ?? undefined,
        url: n.request?.url ?? undefined,
        component: n.request?.component ?? undefined,
        action: n.request?.action ?? undefined,
        request: n.request ?? undefined,
        backtrace: n.backtrace ?? undefined
      }));
    }

    let comments:
      | { commentId: number; body?: string; author?: unknown; createdAt?: string }[]
      | undefined;
    if (includeComments) {
      let commentsData = await client.listComments(
        projectId,
        faultId,
        ctx.input.commentsNextUrl
      );
      commentsNextUrl = commentsData.links?.next ?? undefined;
      comments = (commentsData.results || []).map((c: Comment) => ({
        commentId: c.id ?? undefined,
        body: c.body ?? undefined,
        author: c.author ?? undefined,
        createdAt: c.created_at ?? undefined
      }));
    }

    return {
      output: {
        faultId: fault.id ?? undefined,
        klass: fault.klass ?? undefined,
        message: fault.message ?? undefined,
        component: fault.component ?? undefined,
        action: fault.action ?? undefined,
        environment: fault.environment ?? undefined,
        resolved: fault.resolved ?? undefined,
        ignored: fault.ignored ?? undefined,
        noticesCount: fault.notices_count ?? undefined,
        createdAt: fault.created_at ?? undefined,
        lastNoticeAt: fault.last_notice_at ?? undefined,
        tags: fault.tags ?? undefined,
        assignee: fault.assignee ?? undefined,
        notices,
        noticesNextUrl,
        commentsNextUrl,
        comments,
        url: fault.url ?? undefined
      },
      message: `Error **${fault.klass}**: "${fault.message}" — ${fault.notices_count} occurrence(s), ${fault.resolved ? 'resolved' : 'unresolved'}.`
    };
  })
  .build();
