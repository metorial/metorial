import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FilesComClient } from '../lib/client';
import { spec } from '../spec';

export let fileActivity = SlateTrigger.create(spec, {
  name: 'File Activity',
  key: 'file_activity',
  description:
    'Triggers when file activity occurs on your Files.com site. Receives webhook events for file create, read, update, delete, move, and copy actions. The webhook behavior is automatically registered on your site root folder.'
})
  .input(
    z.object({
      action: z.string().describe('File action: create, read, update, destroy, move, copy'),
      interface: z
        .string()
        .optional()
        .describe('Interface used: web, ftp, sftp, dav, restapi, robot'),
      path: z.string().describe('File path that triggered the webhook'),
      destination: z.string().optional().describe('Destination path for move/copy actions'),
      type: z.string().optional().describe('"file" or "directory"'),
      size: z.number().optional().describe('File size in bytes'),
      username: z.string().optional().describe('User who performed the action'),
      at: z.string().optional().describe('Timestamp of the action')
    })
  )
  .output(
    z.object({
      action: z.string().describe('File action performed'),
      path: z.string().describe('File or folder path'),
      destination: z.string().optional().describe('Destination path for move/copy'),
      fileType: z.string().optional().describe('"file" or "directory"'),
      size: z.number().optional().describe('File size in bytes'),
      username: z.string().optional().describe('User who performed the action'),
      interface: z.string().optional().describe('Interface used'),
      timestamp: z.string().optional().describe('When the action occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FilesComClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let behavior = await client.createBehavior({
        path: '/',
        behavior: 'webhook',
        value: {
          urls: [ctx.input.webhookBaseUrl],
          method: 'POST',
          encoding: 'JSON',
          triggers: ['create', 'read', 'update', 'destroy', 'move', 'copy']
        }
      });

      return {
        registrationDetails: {
          behaviorId: Number(behavior.id)
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FilesComClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let details = ctx.input.registrationDetails as { behaviorId: number };
      if (details?.behaviorId) {
        await client.deleteBehavior(details.behaviorId);
      }
    },

    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') ?? '';
      let inputs: Array<{
        action: string;
        interface?: string;
        path: string;
        destination?: string;
        type?: string;
        size?: number;
        username?: string;
        at?: string;
      }> = [];

      if (contentType.includes('application/json')) {
        let data = (await ctx.request.json()) as Record<string, unknown>;
        inputs.push({
          action: String(data.action ?? ''),
          interface: data.interface ? String(data.interface) : undefined,
          path: String(data.path ?? ''),
          destination: data.destination ? String(data.destination) : undefined,
          type: data.type ? String(data.type) : undefined,
          size: typeof data.size === 'number' ? data.size : undefined,
          username: data.username ? String(data.username) : undefined,
          at: data.at ? String(data.at) : undefined
        });
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        inputs.push({
          action: params.get('action') ?? '',
          interface: params.get('interface') ?? undefined,
          path: params.get('path') ?? '',
          destination: params.get('destination') ?? undefined,
          type: params.get('type') ?? undefined,
          size: params.get('size') ? Number(params.get('size')) : undefined,
          username: params.get('username') ?? undefined,
          at: params.get('at') ?? undefined
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let { action, path } = ctx.input;
      let actionMap: Record<string, string> = {
        create: 'file.created',
        read: 'file.read',
        update: 'file.updated',
        destroy: 'file.deleted',
        move: 'file.moved',
        copy: 'file.copied'
      };

      let eventType = actionMap[action] ?? `file.${action}`;
      let eventId = `${action}-${path}-${ctx.input.at ?? Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          action,
          path,
          destination: ctx.input.destination,
          fileType: ctx.input.type,
          size: ctx.input.size,
          username: ctx.input.username,
          interface: ctx.input.interface,
          timestamp: ctx.input.at
        }
      };
    }
  })
  .build();
