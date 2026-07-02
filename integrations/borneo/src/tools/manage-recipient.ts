import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageRecipient = SlateTool.create(spec, {
  name: 'Manage Recipient',
  key: 'manage_recipient',
  description: `Create, retrieve, update, list, or delete data recipients. Also supports confirming discovered recipients and archiving them. Manage data sharing relationships with compliance tracking.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'get',
          'list',
          'update',
          'delete',
          'add_discovered',
          'archive_discovered',
          'list_discovered'
        ])
        .describe('Action to perform'),
      recipientId: z
        .string()
        .optional()
        .describe('Recipient ID (required for get, update, delete, archive_discovered)'),
      name: z.string().optional().describe('Recipient name'),
      status: z.string().optional().describe('Recipient status'),
      dataStorageLocation: z.array(z.string()).optional().describe('Data storage locations'),
      recipientWarranties: z
        .string()
        .optional()
        .describe('Recipient data protection warranties/guarantees'),
      role: z.string().optional().describe('Recipient role'),
      discoveredRecipientIds: z
        .array(z.string())
        .optional()
        .describe('Array of discovered recipient UUIDs (for add_discovered action)'),
      page: z.number().optional().describe('Page number for listing'),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z
      .object({
        recipient: z.any().optional().describe('Recipient record'),
        recipients: z.array(z.any()).optional().describe('List of recipients'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, recipientId } = ctx.input;

    switch (action) {
      case 'create': {
        if (
          !ctx.input.name ||
          !ctx.input.status ||
          !ctx.input.dataStorageLocation ||
          !ctx.input.recipientWarranties
        ) {
          throw new Error(
            'name, status, dataStorageLocation, and recipientWarranties are required for creating a recipient'
          );
        }
        let result = await client.createRecipient({
          name: ctx.input.name,
          status: ctx.input.status,
          dataStorageLocation: ctx.input.dataStorageLocation,
          recipientWarranties: ctx.input.recipientWarranties,
          role: ctx.input.role
        });
        let data = result?.data ?? result;
        return {
          output: { recipient: data, success: true },
          message: `Recipient **${ctx.input.name}** created.`
        };
      }
      case 'get': {
        if (!recipientId) throw new Error('recipientId is required for get action');
        let result = await client.getRecipient(recipientId);
        let data = result?.data ?? result;
        return {
          output: { recipient: data, success: true },
          message: `Retrieved recipient **${recipientId}**.`
        };
      }
      case 'list': {
        let result = await client.listRecipients({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result?.data ?? result;
        let recipients = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { recipients, success: true },
          message: `Found **${recipients.length}** recipient(s).`
        };
      }
      case 'update': {
        if (!recipientId) throw new Error('recipientId is required for update action');
        let updatePayload: Record<string, any> = {};
        if (ctx.input.name !== undefined) updatePayload.name = ctx.input.name;
        if (ctx.input.status !== undefined) updatePayload.status = ctx.input.status;
        if (ctx.input.dataStorageLocation !== undefined)
          updatePayload.dataStorageLocation = ctx.input.dataStorageLocation;
        if (ctx.input.recipientWarranties !== undefined)
          updatePayload.recipientWarranties = ctx.input.recipientWarranties;
        if (ctx.input.role !== undefined) updatePayload.role = ctx.input.role;

        let result = await client.updateRecipient(recipientId, updatePayload);
        let data = result?.data ?? result;
        return {
          output: { recipient: data, success: true },
          message: `Recipient **${recipientId}** updated.`
        };
      }
      case 'delete': {
        if (!recipientId) throw new Error('recipientId is required for delete action');
        await client.deleteRecipient(recipientId);
        return {
          output: { success: true },
          message: `Recipient **${recipientId}** deleted.`
        };
      }
      case 'add_discovered': {
        if (!ctx.input.discoveredRecipientIds?.length) {
          throw new Error('discoveredRecipientIds is required for add_discovered action');
        }
        let result = await client.addDiscoveredRecipients(ctx.input.discoveredRecipientIds);
        let data = result?.data ?? result;
        return {
          output: { recipient: data, success: true },
          message: `Added **${ctx.input.discoveredRecipientIds.length}** discovered recipient(s) as confirmed.`
        };
      }
      case 'archive_discovered': {
        if (!recipientId)
          throw new Error('recipientId is required for archive_discovered action');
        let result = await client.archiveDiscoveredRecipient(recipientId);
        let data = result?.data ?? result;
        return {
          output: { recipient: data, success: true },
          message: `Discovered recipient **${recipientId}** archived.`
        };
      }
      case 'list_discovered': {
        let result = await client.listDiscoveredRecipients({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder
        });
        let data = result?.data ?? result;
        let recipients = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { recipients, success: true },
          message: `Found **${recipients.length}** discovered recipient(s).`
        };
      }
    }
  })
  .build();
