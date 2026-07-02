import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let designSummarySchema = z.object({
  designId: z.string().describe('The design ID'),
  title: z.string().optional().describe('Design title'),
  editUrl: z.string().optional().describe('Temporary edit URL'),
  viewUrl: z.string().optional().describe('Temporary view URL'),
  thumbnailUrl: z.string().optional().describe('Thumbnail URL'),
  pageCount: z.number().optional().describe('Number of pages')
});

let userSummarySchema = z.object({
  userId: z.string().describe('The user ID'),
  displayName: z.string().optional().describe('User display name')
});

let receivingUserSchema = z.object({
  userId: z.string().describe('The receiving user ID'),
  teamId: z.string().optional().describe('The receiving user team ID'),
  displayName: z.string().optional().describe('Receiving user display name')
});

export let designNotification = SlateTrigger.create(spec, {
  name: 'Design Notification',
  key: 'design_notification',
  description:
    'Triggered when a design-related event occurs, including comments, shares, approval requests/responses, access requests, suggestions, and team invitations.'
})
  .input(
    z.object({
      notificationId: z.string().describe('Unique notification ID'),
      notificationType: z
        .string()
        .describe('Type of notification (e.g., comment, share_design, etc.)'),
      createdAt: z.number().describe('Unix timestamp of the notification'),
      rawContent: z.record(z.string(), z.unknown()).describe('Raw notification content')
    })
  )
  .output(
    z.object({
      notificationId: z.string().describe('Unique notification ID'),
      notificationType: z.string().describe('Notification type'),
      createdAt: z.number().describe('Unix timestamp of the notification'),
      triggeringUser: userSummarySchema
        .optional()
        .describe('The user who triggered the event'),
      receivingUser: receivingUserSchema
        .optional()
        .describe('The user receiving the notification'),
      design: designSummarySchema.optional().describe('The affected design'),
      commentEventType: z
        .string()
        .optional()
        .describe(
          'Comment event sub-type: "new", "assigned", "resolved", "reply", or "mention"'
        ),
      commentThreadId: z
        .string()
        .optional()
        .describe('Comment thread ID (for comment events)'),
      commentContent: z.string().optional().describe('Comment or reply text content'),
      commentUrl: z.string().optional().describe('URL to the comment on the design'),
      suggestionEventType: z
        .string()
        .optional()
        .describe('Suggestion event sub-type: "new" or "accepted"'),
      shareUrl: z.string().optional().describe('Share URL (for share events)'),
      shareMessage: z.string().optional().describe('Share message (for share events)'),
      approvalMessage: z.string().optional().describe('Approval request message'),
      approvalApproved: z
        .boolean()
        .optional()
        .describe('Whether the design was approved (for approval response events)'),
      approvalReadyToPublish: z
        .boolean()
        .optional()
        .describe('Whether the design is ready to publish'),
      accessRequestUrl: z.string().optional().describe('URL to approve access request'),
      folderName: z.string().optional().describe('Folder name (for folder access requests)'),
      folderId: z.string().optional().describe('Folder ID (for folder access requests)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: WebhookPayload;
      try {
        body = (await ctx.request.json()) as WebhookPayload;
      } catch {
        return { inputs: [] };
      }

      if (!body.id || !body.content) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            notificationId: body.id,
            notificationType: body.content.type || 'unknown',
            createdAt: body.created_at || 0,
            rawContent: body.content as Record<string, unknown>
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let content = ctx.input.rawContent;
      let notificationType = ctx.input.notificationType;

      let triggeringUser = extractUser(
        content.triggering_user as Record<string, unknown> | undefined
      );
      let receivingUser = extractReceivingUser(
        content.receiving_team_user as Record<string, unknown> | undefined
      );
      let design = extractDesign(content.design as Record<string, unknown> | undefined);

      let commentEventType: string | undefined;
      let commentThreadId: string | undefined;
      let commentContent: string | undefined;
      let commentUrl: string | undefined;
      let suggestionEventType: string | undefined;
      let shareUrl: string | undefined;
      let shareMessage: string | undefined;
      let approvalMessage: string | undefined;
      let approvalApproved: boolean | undefined;
      let approvalReadyToPublish: boolean | undefined;
      let accessRequestUrl: string | undefined;
      let folderName: string | undefined;
      let folderId: string | undefined;

      if (notificationType === 'comment') {
        let commentEvent = content.comment_event as Record<string, unknown> | undefined;
        if (commentEvent) {
          commentEventType = commentEvent.type as string | undefined;
          commentUrl = commentEvent.comment_url as string | undefined;

          let thread = commentEvent.thread as Record<string, unknown> | undefined;
          if (thread) {
            commentThreadId = thread.id as string | undefined;
            let threadContent = thread.content as Record<string, unknown> | undefined;
            commentContent = threadContent?.plaintext as string | undefined;
          }

          let reply = commentEvent.reply as Record<string, unknown> | undefined;
          if (reply) {
            let replyContent = reply.content as Record<string, unknown> | undefined;
            commentContent = replyContent?.plaintext as string | undefined;
            commentThreadId = reply.thread_id as string | undefined;
          }
        }
      } else if (notificationType === 'suggestion') {
        let suggestionEvent = content.suggestion_event as Record<string, unknown> | undefined;
        if (suggestionEvent) {
          suggestionEventType = suggestionEvent.type as string | undefined;
        }
      } else if (notificationType === 'share_design') {
        shareUrl = content.share_url as string | undefined;
        let share = content.share as Record<string, unknown> | undefined;
        shareMessage = share?.message as string | undefined;
      } else if (notificationType === 'design_approval_requested') {
        let approval = content.approval as Record<string, unknown> | undefined;
        approvalMessage = approval?.message as string | undefined;
      } else if (notificationType === 'design_approval_response') {
        let approval = content.approval as Record<string, unknown> | undefined;
        approvalApproved = approval?.approved as boolean | undefined;
        approvalReadyToPublish = approval?.ready_to_publish as boolean | undefined;
      } else if (notificationType === 'design_access_requested') {
        accessRequestUrl = content.access_request_url as string | undefined;
      } else if (notificationType === 'folder_access_requested') {
        let folder = content.folder as Record<string, unknown> | undefined;
        folderName = folder?.name as string | undefined;
        folderId = folder?.id as string | undefined;
      }

      let eventType = notificationType;
      if (commentEventType) {
        eventType = `comment.${commentEventType}`;
      } else if (suggestionEventType) {
        eventType = `suggestion.${suggestionEventType}`;
      }

      return {
        type: eventType,
        id: ctx.input.notificationId,
        output: {
          notificationId: ctx.input.notificationId,
          notificationType,
          createdAt: ctx.input.createdAt,
          triggeringUser,
          receivingUser,
          design,
          commentEventType,
          commentThreadId,
          commentContent,
          commentUrl,
          suggestionEventType,
          shareUrl,
          shareMessage,
          approvalMessage,
          approvalApproved,
          approvalReadyToPublish,
          accessRequestUrl,
          folderName,
          folderId
        }
      };
    }
  })
  .build();

// ---- Helper types ----

interface WebhookPayload {
  id: string;
  created_at: number;
  content: Record<string, unknown> & {
    type?: string;
  };
}

// ---- Helper functions ----

let extractUser = (
  raw: Record<string, unknown> | undefined
): { userId: string; displayName?: string } | undefined => {
  if (!raw) return undefined;
  return {
    userId: raw.id as string,
    displayName: raw.display_name as string | undefined
  };
};

let extractReceivingUser = (
  raw: Record<string, unknown> | undefined
): { userId: string; teamId?: string; displayName?: string } | undefined => {
  if (!raw) return undefined;
  return {
    userId: raw.user_id as string,
    teamId: raw.team_id as string | undefined,
    displayName: raw.display_name as string | undefined
  };
};

let extractDesign = (
  raw: Record<string, unknown> | undefined
):
  | {
      designId: string;
      title?: string;
      editUrl?: string;
      viewUrl?: string;
      thumbnailUrl?: string;
      pageCount?: number;
    }
  | undefined => {
  if (!raw) return undefined;
  let urls = raw.urls as Record<string, string> | undefined;
  let thumbnail = raw.thumbnail as Record<string, unknown> | undefined;
  return {
    designId: raw.id as string,
    title: raw.title as string | undefined,
    editUrl: urls?.edit_url,
    viewUrl: urls?.view_url,
    thumbnailUrl: thumbnail?.url as string | undefined,
    pageCount: raw.page_count as number | undefined
  };
};
