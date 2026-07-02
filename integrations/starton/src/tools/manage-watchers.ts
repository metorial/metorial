import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

let watcherTypeEnum = z
  .enum([
    'ADDRESS_ACTIVITY',
    'ADDRESS_RECEIVED_NATIVE_CURRENCY',
    'ADDRESS_SENT_NATIVE_CURRENCY',
    'EVENT_TRANSFER',
    'EVENT_MINT',
    'EVENT_APPROVAL',
    'ERC721_EVENT_TRANSFER',
    'ERC1155_EVENT_TRANSFER_BATCH',
    'ERC1155_EVENT_TRANSFER_SINGLE',
    'EVENT_CUSTOM'
  ])
  .describe('Type of blockchain event to monitor');

export let manageWatchers = SlateTool.create(spec, {
  name: 'Manage Watchers',
  key: 'manage_watchers',
  description: `Create, list, update, pause, resume, or delete blockchain watchers. Watchers monitor on-chain events (address activity, token transfers, mints, approvals, custom events) and send notifications via webhooks when conditions are met.`,
  instructions: [
    'When creating a watcher, you must provide a webhookUrl where event notifications will be sent.',
    'For EVENT_CUSTOM type, provide customEventAbi with the event ABI from the contract.',
    'Use confirmationsBlocks to control how many block confirmations are required before triggering.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete'])
        .describe('Watcher management action'),
      watcherId: z
        .string()
        .optional()
        .describe('Watcher ID (required for get, update, delete)'),

      // Create params
      name: z.string().optional().describe('Watcher name (for create/update)'),
      description: z.string().optional().describe('Watcher description (for create/update)'),
      address: z.string().optional().describe('Address to monitor (for create)'),
      network: z.string().optional().describe('Blockchain network (for create/list)'),
      watcherType: watcherTypeEnum.optional().describe('Event type to monitor (for create)'),
      webhookUrl: z.string().optional().describe('Webhook URL for notifications (for create)'),
      confirmationsBlocks: z
        .number()
        .default(12)
        .describe('Block confirmations before triggering (for create)'),
      customEventAbi: z
        .any()
        .optional()
        .describe('Custom event ABI for EVENT_CUSTOM type (for create)'),

      // Update params
      isPaused: z.boolean().optional().describe('Pause or resume the watcher (for update)'),

      // List params
      limit: z.number().default(20).describe('Number of watchers to return (for list)'),
      page: z.number().default(0).describe('Page number (for list)')
    })
  )
  .output(
    z.object({
      watchers: z
        .array(
          z.object({
            watcherId: z.string().describe('Watcher identifier'),
            name: z.string().optional().describe('Watcher name'),
            address: z.string().optional().describe('Monitored address'),
            network: z.string().optional().describe('Blockchain network'),
            watcherType: z.string().optional().describe('Event type'),
            webhookUrl: z.string().optional().describe('Webhook URL'),
            isPaused: z.boolean().optional().describe('Whether the watcher is paused'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('Watcher details'),
      totalCount: z.number().optional().describe('Total number of watchers'),
      deleted: z.boolean().optional().describe('Whether a watcher was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.address ||
        !ctx.input.network ||
        !ctx.input.watcherType ||
        !ctx.input.webhookUrl
      ) {
        throw new Error(
          'address, network, watcherType, and webhookUrl are required for creating a watcher'
        );
      }
      let result = await client.createWatcher({
        name: ctx.input.name || `Watcher for ${ctx.input.address}`,
        description: ctx.input.description,
        address: ctx.input.address,
        network: ctx.input.network,
        type: ctx.input.watcherType,
        webhookUrl: ctx.input.webhookUrl,
        confirmationsBlocks: ctx.input.confirmationsBlocks,
        customEventAbi: ctx.input.customEventAbi
      });

      return {
        output: {
          watchers: [
            {
              watcherId: result.id || '',
              name: result.name,
              address: result.address,
              network: result.network,
              watcherType: result.type,
              webhookUrl: result.webhookUrl,
              isPaused: result.isPaused,
              createdAt: result.createdAt
            }
          ],
          totalCount: 1,
          deleted: undefined
        },
        message: `Created watcher **${result.name || ctx.input.name}** monitoring \`${ctx.input.address}\` on ${ctx.input.network} for ${ctx.input.watcherType} events.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.watcherId) throw new Error('watcherId is required');
      let result = await client.getWatcher(ctx.input.watcherId);

      return {
        output: {
          watchers: [
            {
              watcherId: result.id || ctx.input.watcherId,
              name: result.name,
              address: result.address,
              network: result.network,
              watcherType: result.type,
              webhookUrl: result.webhookUrl,
              isPaused: result.isPaused,
              createdAt: result.createdAt
            }
          ],
          totalCount: 1,
          deleted: undefined
        },
        message: `Retrieved watcher **${result.name}** (${result.type}) on ${result.network}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.watcherId) throw new Error('watcherId is required');
      let result = await client.updateWatcher(ctx.input.watcherId, {
        name: ctx.input.name,
        description: ctx.input.description,
        isPaused: ctx.input.isPaused
      });

      return {
        output: {
          watchers: [
            {
              watcherId: result.id || ctx.input.watcherId,
              name: result.name,
              address: result.address,
              network: result.network,
              watcherType: result.type,
              webhookUrl: result.webhookUrl,
              isPaused: result.isPaused,
              createdAt: result.createdAt
            }
          ],
          totalCount: 1,
          deleted: undefined
        },
        message: `Updated watcher **${result.name || ctx.input.watcherId}**.${ctx.input.isPaused !== undefined ? ` Paused: ${ctx.input.isPaused}` : ''}`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.watcherId) throw new Error('watcherId is required');
      await client.deleteWatcher(ctx.input.watcherId);

      return {
        output: {
          watchers: [],
          totalCount: 0,
          deleted: true
        },
        message: `Deleted watcher \`${ctx.input.watcherId}\`.`
      };
    }

    // List
    let result = await client.listWatchers({
      limit: ctx.input.limit,
      page: ctx.input.page,
      network: ctx.input.network
    });

    let items = result.items || result || [];

    return {
      output: {
        watchers: items.map((w: any) => ({
          watcherId: w.id || '',
          name: w.name,
          address: w.address,
          network: w.network,
          watcherType: w.type,
          webhookUrl: w.webhookUrl,
          isPaused: w.isPaused,
          createdAt: w.createdAt
        })),
        totalCount: result.meta?.totalCount || items.length,
        deleted: undefined
      },
      message: `Found **${items.length}** watchers${ctx.input.network ? ` on ${ctx.input.network}` : ''}.`
    };
  })
  .build();
