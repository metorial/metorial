import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let repositoryEvents = SlateTrigger.create(spec, {
  name: 'Repository Events',
  key: 'repository_events',
  description:
    'Triggers on repository lifecycle events including creation, deletion, forking, and branch/tag creation or deletion.'
})
  .input(
    z.object({
      eventType: z.string().describe('Gitea event header value'),
      action: z.string().describe('Event action'),
      ref: z.string().optional().describe('Branch or tag ref for create/delete events'),
      refType: z
        .string()
        .optional()
        .describe('Ref type (branch or tag) for create/delete events'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name'),
      repositoryHtmlUrl: z.string().describe('Repository URL'),
      repositoryDescription: z.string().describe('Repository description'),
      isPrivate: z.boolean().describe('Whether the repository is private'),
      senderLogin: z.string().describe('User who triggered the event')
    })
  )
  .output(
    z.object({
      action: z
        .string()
        .describe(
          'Event action (created, deleted, forked, branch_created, branch_deleted, tag_created, tag_deleted)'
        ),
      ref: z.string().optional().describe('Branch or tag name for ref events'),
      refType: z.string().optional().describe('Whether ref is a branch or tag'),
      repositoryFullName: z.string().describe('Full repository name'),
      repositoryOwner: z.string().describe('Repository owner'),
      repositoryName: z.string().describe('Repository name'),
      repositoryHtmlUrl: z.string().describe('Web URL of the repository'),
      repositoryDescription: z.string().describe('Repository description'),
      isPrivate: z.boolean().describe('Whether the repository is private'),
      senderLogin: z.string().describe('User who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let eventType = ctx.request.headers.get('X-Gitea-Event') || '';
      let repoEventTypes = ['repository', 'create', 'delete'];

      if (!repoEventTypes.includes(eventType)) {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as Record<string, any>;

      let action = String(data.action || eventType);
      let ref: string | undefined;
      let refType: string | undefined;

      if (eventType === 'create' || eventType === 'delete') {
        ref = String(data.ref || '');
        refType = String(data.ref_type || '');
        action = `${refType}_${eventType}d`;
      }

      return {
        inputs: [
          {
            eventType,
            action,
            ref,
            refType,
            repositoryFullName: String(data.repository?.full_name || ''),
            repositoryOwner: String(data.repository?.owner?.login || ''),
            repositoryName: String(data.repository?.name || ''),
            repositoryHtmlUrl: String(data.repository?.html_url || ''),
            repositoryDescription: String(data.repository?.description || ''),
            isPrivate: Boolean(data.repository?.private),
            senderLogin: String(data.sender?.login || '')
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let type: string;
      if (ctx.input.eventType === 'create' || ctx.input.eventType === 'delete') {
        type = `${ctx.input.refType}.${ctx.input.eventType}d`;
      } else {
        type = `repository.${ctx.input.action}`;
      }

      return {
        type,
        id: `repo-${ctx.input.repositoryFullName}-${ctx.input.eventType}-${ctx.input.action}-${ctx.input.ref || ''}-${Date.now()}`,
        output: {
          action: ctx.input.action,
          ref: ctx.input.ref,
          refType: ctx.input.refType,
          repositoryFullName: ctx.input.repositoryFullName,
          repositoryOwner: ctx.input.repositoryOwner,
          repositoryName: ctx.input.repositoryName,
          repositoryHtmlUrl: ctx.input.repositoryHtmlUrl,
          repositoryDescription: ctx.input.repositoryDescription,
          isPrivate: ctx.input.isPrivate,
          senderLogin: ctx.input.senderLogin
        }
      };
    }
  })
  .build();
