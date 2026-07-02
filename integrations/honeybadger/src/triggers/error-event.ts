import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let errorEvent = SlateTrigger.create(spec, {
  name: 'Error Event',
  key: 'error_event',
  description:
    'Triggers when an error event occurs in Honeybadger — including new errors, resolved, unresolved, assigned, commented, or rate exceeded events.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of error event'),
      faultId: z.number().describe('Fault ID'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      faultUrl: z.string().optional().describe('URL to the fault'),
      faultKlass: z.string().optional().describe('Error class'),
      faultMessage: z.string().optional().describe('Error message'),
      faultComponent: z.string().optional().describe('Component'),
      faultAction: z.string().optional().describe('Action'),
      faultEnvironment: z.string().optional().describe('Environment'),
      faultAssignee: z.any().optional().describe('Assignee details'),
      noticeMessage: z.string().optional().describe('Notice message'),
      noticeUrl: z.string().optional().describe('Notice URL'),
      noticeCreatedAt: z.string().optional().describe('Notice creation time'),
      commentBody: z.string().optional().describe('Comment body (for commented events)'),
      commentAuthor: z.string().optional().describe('Comment author name')
    })
  )
  .output(
    z.object({
      faultId: z.number().describe('Fault ID'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().optional().describe('Project name'),
      faultUrl: z.string().optional().describe('URL to view the fault'),
      errorClass: z.string().optional().describe('Error class name'),
      errorMessage: z.string().optional().describe('Error message'),
      component: z.string().optional().describe('Component'),
      action: z.string().optional().describe('Action'),
      environment: z.string().optional().describe('Environment'),
      assigneeName: z.string().optional().describe('Assignee name'),
      assigneeEmail: z.string().optional().describe('Assignee email'),
      noticeMessage: z.string().optional().describe('Notice message'),
      noticeUrl: z.string().optional().describe('Notice URL'),
      noticeCreatedAt: z.string().optional().describe('When the notice was created'),
      commentBody: z.string().optional().describe('Comment body'),
      commentAuthor: z.string().optional().describe('Comment author')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let event = body.event || 'occurred';

      let fault = body.fault || {};
      let project = body.project || {};
      let notice = body.notice || {};
      let assignee = fault.assignee || body.assignee;
      let comment = body.comment || {};

      return {
        inputs: [
          {
            eventType: event,
            faultId: fault.id,
            projectId: project.id,
            projectName: project.name,
            faultUrl: fault.url,
            faultKlass: fault.klass,
            faultMessage: fault.message,
            faultComponent: fault.component,
            faultAction: fault.action,
            faultEnvironment: fault.environment,
            faultAssignee: assignee,
            noticeMessage: notice.message,
            noticeUrl: notice.url,
            noticeCreatedAt: notice.created_at,
            commentBody: comment.body,
            commentAuthor: comment.author?.name
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let {
        eventType,
        faultId,
        projectId,
        projectName,
        faultUrl,
        faultKlass,
        faultMessage,
        faultComponent,
        faultAction,
        faultEnvironment,
        faultAssignee,
        noticeMessage,
        noticeUrl,
        noticeCreatedAt,
        commentBody,
        commentAuthor
      } = ctx.input;

      return {
        type: `fault.${eventType}`,
        id: `${projectId}-${faultId}-${eventType}-${noticeCreatedAt || Date.now()}`,
        output: {
          faultId,
          projectId,
          projectName,
          faultUrl,
          errorClass: faultKlass,
          errorMessage: faultMessage,
          component: faultComponent,
          action: faultAction,
          environment: faultEnvironment,
          assigneeName: faultAssignee?.name,
          assigneeEmail: faultAssignee?.email,
          noticeMessage,
          noticeUrl,
          noticeCreatedAt,
          commentBody,
          commentAuthor
        }
      };
    }
  })
  .build();
