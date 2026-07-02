import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let issueEventsTrigger = SlateTrigger.create(spec, {
  name: 'Issue Events',
  key: 'issue_events',
  description:
    'Triggers when an issue is created, resolved, assigned, ignored, or archived in Sentry. Configure the webhook URL in your Sentry integration under Settings > Developer Settings.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('The action that occurred (created, resolved, assigned, ignored, archived)'),
      issueId: z.string().describe('The issue ID'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      issueId: z.string(),
      shortId: z.string(),
      title: z.string(),
      culprit: z.string().optional(),
      level: z.string().optional(),
      status: z.string().optional(),
      platform: z.string().optional(),
      projectSlug: z.string().optional(),
      projectName: z.string().optional(),
      firstSeen: z.string().optional(),
      lastSeen: z.string().optional(),
      assignedTo: z.any().optional(),
      permalink: z.string().optional(),
      metadata: z.any().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let action = body.action || 'unknown';
      let issueData = body.data?.issue || body.data || {};

      return {
        inputs: [
          {
            action,
            issueId: String(issueData.id || ''),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let issue = ctx.input.payload?.data?.issue || ctx.input.payload?.data || {};

      return {
        type: `issue.${ctx.input.action}`,
        id: `issue-${ctx.input.issueId}-${ctx.input.action}-${Date.now()}`,
        output: {
          issueId: String(issue.id || ctx.input.issueId),
          shortId: issue.shortId || '',
          title: issue.title || '',
          culprit: issue.culprit,
          level: issue.level,
          status: issue.status,
          platform: issue.platform,
          projectSlug: issue.project?.slug,
          projectName: issue.project?.name,
          firstSeen: issue.firstSeen,
          lastSeen: issue.lastSeen,
          assignedTo: issue.assignedTo,
          permalink: issue.permalink,
          metadata: issue.metadata
        }
      };
    }
  })
  .build();
