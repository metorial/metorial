import { SlateTool } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

export let manageNotification = SlateTool.create(spec, {
  name: 'Manage Notification',
  key: 'manage_notification',
  description: `Create, update, list, or delete notification rules. Notifications alert users or groups when specific file activities (upload, download, copy, move, delete) occur in a folder. Supports configurable intervals, file pattern matching, and recursive folder monitoring.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      notificationId: z
        .number()
        .optional()
        .describe('Notification ID (required for update and delete)'),
      path: z
        .string()
        .optional()
        .describe('Folder path to monitor (required for create, optional filter for list)'),
      userId: z
        .number()
        .optional()
        .describe(
          'User ID to receive notification (one of userId, username, or groupId required for create)'
        ),
      username: z.string().optional().describe('Username to receive notification'),
      groupId: z.number().optional().describe('Group ID to receive notification'),
      notifyOnUpload: z.boolean().optional().describe('Notify on file uploads'),
      notifyOnDownload: z.boolean().optional().describe('Notify on file downloads'),
      notifyOnCopy: z.boolean().optional().describe('Notify on file copies'),
      notifyOnMove: z.boolean().optional().describe('Notify on file moves'),
      notifyOnDelete: z.boolean().optional().describe('Notify on file deletes'),
      recursive: z.boolean().optional().describe('Apply to subfolders'),
      sendInterval: z
        .enum(['five_minutes', 'fifteen_minutes', 'hourly', 'daily'])
        .optional()
        .describe('How often to send notification summaries'),
      message: z.string().optional().describe('Custom notification message text'),
      triggeringFilenames: z
        .array(z.string())
        .optional()
        .describe('File patterns to trigger on (supports wildcards)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)'),
      perPage: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      notifications: z
        .array(
          z.object({
            notificationId: z.number().describe('Notification ID'),
            path: z.string().optional().describe('Monitored folder path'),
            userId: z.number().optional().describe('Notified user ID'),
            username: z.string().optional().describe('Notified username'),
            groupId: z.number().optional().describe('Notified group ID'),
            groupName: z.string().optional().describe('Notified group name'),
            sendInterval: z.string().optional().describe('Send interval'),
            recursive: z.boolean().optional().describe('Applies to subfolders'),
            notifyOnUpload: z.boolean().optional().describe('Upload notifications'),
            notifyOnDownload: z.boolean().optional().describe('Download notifications')
          })
        )
        .optional()
        .describe('List of notifications'),
      notification: z
        .object({
          notificationId: z.number().describe('Notification ID'),
          path: z.string().optional().describe('Monitored folder path'),
          userId: z.number().optional().describe('Notified user ID'),
          username: z.string().optional().describe('Notified username'),
          groupId: z.number().optional().describe('Notified group ID'),
          sendInterval: z.string().optional().describe('Send interval')
        })
        .optional()
        .describe('Created or updated notification'),
      deleted: z.boolean().optional().describe('Whether notification was deleted'),
      nextCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FilesComClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let { action, notificationId } = ctx.input;

    if (action === 'list') {
      let result = await client.listNotifications({
        path: ctx.input.path,
        userId: ctx.input.userId,
        groupId: ctx.input.groupId,
        cursor: ctx.input.cursor,
        perPage: ctx.input.perPage
      });

      let notifications = result.notifications.map((n: Record<string, unknown>) => ({
        notificationId: Number(n.id),
        path: n.path ? String(n.path) : undefined,
        userId: typeof n.user_id === 'number' ? n.user_id : undefined,
        username: n.username ? String(n.username) : undefined,
        groupId: typeof n.group_id === 'number' ? n.group_id : undefined,
        groupName: n.group_name ? String(n.group_name) : undefined,
        sendInterval: n.send_interval ? String(n.send_interval) : undefined,
        recursive: typeof n.recursive === 'boolean' ? n.recursive : undefined,
        notifyOnUpload:
          typeof n.notify_on_upload === 'boolean' ? n.notify_on_upload : undefined,
        notifyOnDownload:
          typeof n.notify_on_download === 'boolean' ? n.notify_on_download : undefined
      }));

      return {
        output: { notifications, nextCursor: result.cursor },
        message: `Found **${notifications.length}** notifications${ctx.input.path ? ` for path \`${ctx.input.path}\`` : ''}`
      };
    }

    if (action === 'delete') {
      if (!notificationId) throw new Error('notificationId is required for delete');
      await client.deleteNotification(notificationId);
      return {
        output: { deleted: true },
        message: `Deleted notification **${notificationId}**`
      };
    }

    let data: Record<string, unknown> = {};
    if (ctx.input.path !== undefined) data.path = ctx.input.path;
    if (ctx.input.userId !== undefined) data.user_id = ctx.input.userId;
    if (ctx.input.username !== undefined) data.username = ctx.input.username;
    if (ctx.input.groupId !== undefined) data.group_id = ctx.input.groupId;
    if (ctx.input.notifyOnUpload !== undefined)
      data.notify_on_upload = ctx.input.notifyOnUpload;
    if (ctx.input.notifyOnDownload !== undefined)
      data.notify_on_download = ctx.input.notifyOnDownload;
    if (ctx.input.notifyOnCopy !== undefined) data.notify_on_copy = ctx.input.notifyOnCopy;
    if (ctx.input.notifyOnMove !== undefined) data.notify_on_move = ctx.input.notifyOnMove;
    if (ctx.input.notifyOnDelete !== undefined)
      data.notify_on_delete = ctx.input.notifyOnDelete;
    if (ctx.input.recursive !== undefined) data.recursive = ctx.input.recursive;
    if (ctx.input.sendInterval !== undefined) data.send_interval = ctx.input.sendInterval;
    if (ctx.input.message !== undefined) data.message = ctx.input.message;
    if (ctx.input.triggeringFilenames !== undefined)
      data.triggering_filenames = ctx.input.triggeringFilenames;

    if (action === 'create') {
      let result = await client.createNotification(data);
      return {
        output: {
          notification: {
            notificationId: Number(result.id),
            path: result.path ? String(result.path) : undefined,
            userId: typeof result.user_id === 'number' ? result.user_id : undefined,
            username: result.username ? String(result.username) : undefined,
            groupId: typeof result.group_id === 'number' ? result.group_id : undefined,
            sendInterval: result.send_interval ? String(result.send_interval) : undefined
          }
        },
        message: `Created notification on \`${ctx.input.path || '/'}\``
      };
    }

    // update
    if (!notificationId) throw new Error('notificationId is required for update');
    let result = await client.updateNotification(notificationId, data);
    return {
      output: {
        notification: {
          notificationId: Number(result.id),
          path: result.path ? String(result.path) : undefined,
          userId: typeof result.user_id === 'number' ? result.user_id : undefined,
          username: result.username ? String(result.username) : undefined,
          groupId: typeof result.group_id === 'number' ? result.group_id : undefined,
          sendInterval: result.send_interval ? String(result.send_interval) : undefined
        }
      },
      message: `Updated notification **${notificationId}**`
    };
  })
  .build();
