import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Triggers when a comment (note) is posted or edited on a commit, merge request, issue, or snippet.'
})
  .input(
    z.object({
      noteId: z.number().describe('Note/comment ID'),
      body: z.string().describe('Comment body'),
      noteableType: z
        .string()
        .describe('Type of resource commented on (Issue, MergeRequest, Commit, Snippet)'),
      noteableId: z.number().nullable().describe('ID of the commented resource'),
      noteableIid: z
        .number()
        .nullable()
        .describe('IID of the commented resource (if applicable)'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      projectUrl: z.string().describe('Project web URL'),
      noteUrl: z.string().describe('URL to the comment'),
      authorUsername: z.string().describe('Comment author username'),
      createdAt: z.string().describe('Comment creation timestamp'),
      updatedAt: z.string().describe('Comment update timestamp')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('Comment ID'),
      body: z.string().describe('Comment body'),
      noteableType: z
        .string()
        .describe('Type of resource (Issue, MergeRequest, Commit, Snippet)'),
      noteableIid: z.number().nullable().describe('IID of the commented resource'),
      projectId: z.number().describe('Project ID'),
      projectName: z.string().describe('Project name'),
      noteUrl: z.string().describe('URL to the comment'),
      authorUsername: z.string().describe('Comment author username'),
      createdAt: z.string().describe('Comment timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GitLabClient({
        token: ctx.auth.token,
        instanceUrl: ctx.auth.instanceUrl
      });

      let projectId = (ctx as any).state?.projectId || (ctx as any).config?.projectId;
      if (!projectId) {
        throw gitLabServiceError(
          'A project ID must be configured to register comment webhooks'
        );
      }

      let webhook = await client.createProjectWebhook(projectId, {
        url: ctx.input.webhookBaseUrl,
        pushEvents: false,
        tagPushEvents: false,
        mergeRequestsEvents: false,
        issuesEvents: false,
        noteEvents: true,
        confidentialNoteEvents: true,
        pipelineEvents: false,
        jobEvents: false,
        deploymentEvents: false,
        releasesEvents: false
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          projectId: projectId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GitLabClient({
        token: ctx.auth.token,
        instanceUrl: ctx.auth.instanceUrl
      });

      let details = ctx.input.registrationDetails as { webhookId: number; projectId: string };
      await client.deleteProjectWebhook(details.projectId, details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventHeader = ctx.request.headers.get('X-Gitlab-Event');

      if (eventHeader !== 'Note Hook' && eventHeader !== 'Confidential Note Hook') {
        return { inputs: [] };
      }

      let attrs = data.object_attributes || {};
      let project = data.project || {};

      // Determine the noteable IID based on type
      let noteableIid: number | null = null;
      if (attrs.noteable_type === 'Issue' && data.issue) {
        noteableIid = data.issue.iid;
      } else if (attrs.noteable_type === 'MergeRequest' && data.merge_request) {
        noteableIid = data.merge_request.iid;
      }

      return {
        inputs: [
          {
            noteId: attrs.id || 0,
            body: attrs.note || '',
            noteableType: attrs.noteable_type || '',
            noteableId: attrs.noteable_id || null,
            noteableIid,
            projectId: project.id || 0,
            projectName: project.name || '',
            projectUrl: project.web_url || '',
            noteUrl: attrs.url || '',
            authorUsername: data.user?.username || '',
            createdAt: attrs.created_at || new Date().toISOString(),
            updatedAt: attrs.updated_at || attrs.created_at || new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let noteableType = ctx.input.noteableType.toLowerCase();

      return {
        type: `comment.${noteableType}`,
        id: `note_${ctx.input.noteId}_${ctx.input.updatedAt}`,
        output: {
          noteId: ctx.input.noteId,
          body: ctx.input.body,
          noteableType: ctx.input.noteableType,
          noteableIid: ctx.input.noteableIid,
          projectId: ctx.input.projectId,
          projectName: ctx.input.projectName,
          noteUrl: ctx.input.noteUrl,
          authorUsername: ctx.input.authorUsername,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
