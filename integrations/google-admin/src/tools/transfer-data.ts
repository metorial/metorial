import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let transferData = SlateTool.create(spec, {
  name: 'Transfer Data',
  key: 'transfer_data',
  description: `Transfer ownership of application data (Drive files, Calendar, etc.) from one user to another. Typically used during employee offboarding. Can also list available applications and check transfer status.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .scopes(googleAdminActionScopes.transferData)
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'list_applications'])
        .describe('Action to perform'),
      transferId: z.string().optional().describe('Transfer ID (for get action)'),
      oldOwnerUserId: z
        .string()
        .optional()
        .describe('User ID of the current data owner (for create/list)'),
      newOwnerUserId: z
        .string()
        .optional()
        .describe('User ID of the new data owner (for create/list)'),
      applicationDataTransfers: z
        .array(
          z.object({
            applicationId: z
              .string()
              .describe(
                'Application ID to transfer data from (use list_applications to find IDs)'
              ),
            applicationTransferParams: z
              .array(
                z.object({
                  key: z.string().describe('Transfer parameter key'),
                  value: z.array(z.string()).describe('Transfer parameter values')
                })
              )
              .optional()
              .describe('Application-specific transfer parameters')
          })
        )
        .optional()
        .describe('Applications and data to transfer (required for create)'),
      status: z.string().optional().describe('Filter transfers by status (for list action)'),
      maxResults: z.number().optional(),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      transfer: z
        .object({
          transferId: z.string().optional(),
          oldOwnerUserId: z.string().optional(),
          newOwnerUserId: z.string().optional(),
          overallTransferStatusCode: z.string().optional(),
          requestTime: z.string().optional(),
          applicationDataTransfers: z.array(z.any()).optional()
        })
        .optional(),
      transfers: z
        .array(
          z.object({
            transferId: z.string().optional(),
            oldOwnerUserId: z.string().optional(),
            newOwnerUserId: z.string().optional(),
            overallTransferStatusCode: z.string().optional(),
            requestTime: z.string().optional()
          })
        )
        .optional(),
      applications: z
        .array(
          z.object({
            applicationId: z.string().optional(),
            applicationName: z.string().optional(),
            transferParams: z.array(z.any()).optional()
          })
        )
        .optional(),
      nextPageToken: z.string().optional(),
      action: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId,
      domain: ctx.config.domain
    });

    if (ctx.input.action === 'list_applications') {
      let result = await client.listDataTransferApplications();
      let apps = (result.applications || []).map((a: any) => ({
        applicationId: String(a.id),
        applicationName: a.name,
        transferParams: a.transferParams
      }));
      return {
        output: { applications: apps, action: 'list_applications' },
        message: `Found **${apps.length}** applications available for data transfer.`
      };
    }

    if (ctx.input.action === 'create') {
      if (
        !ctx.input.oldOwnerUserId ||
        !ctx.input.newOwnerUserId ||
        !ctx.input.applicationDataTransfers
      ) {
        throw new Error(
          'oldOwnerUserId, newOwnerUserId, and applicationDataTransfers are required'
        );
      }
      let t = await client.createDataTransfer({
        oldOwnerUserId: ctx.input.oldOwnerUserId,
        newOwnerUserId: ctx.input.newOwnerUserId,
        applicationDataTransfers: ctx.input.applicationDataTransfers
      });
      return {
        output: {
          transfer: {
            transferId: t.id,
            oldOwnerUserId: t.oldOwnerUserId,
            newOwnerUserId: t.newOwnerUserId,
            overallTransferStatusCode: t.overallTransferStatusCode,
            requestTime: t.requestTime,
            applicationDataTransfers: t.applicationDataTransfers
          },
          action: 'create'
        },
        message: `Created data transfer from user **${ctx.input.oldOwnerUserId}** to **${ctx.input.newOwnerUserId}** (status: ${t.overallTransferStatusCode}).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.transferId) throw new Error('transferId is required for get');
      let t = await client.getDataTransfer(ctx.input.transferId);
      return {
        output: {
          transfer: {
            transferId: t.id,
            oldOwnerUserId: t.oldOwnerUserId,
            newOwnerUserId: t.newOwnerUserId,
            overallTransferStatusCode: t.overallTransferStatusCode,
            requestTime: t.requestTime,
            applicationDataTransfers: t.applicationDataTransfers
          },
          action: 'get'
        },
        message: `Transfer **${t.id}** status: **${t.overallTransferStatusCode}**.`
      };
    }

    // list
    let result = await client.listDataTransfers({
      oldOwnerUserId: ctx.input.oldOwnerUserId,
      newOwnerUserId: ctx.input.newOwnerUserId,
      status: ctx.input.status,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken
    });

    let transfers = (result.dataTransfers || []).map((t: any) => ({
      transferId: t.id,
      oldOwnerUserId: t.oldOwnerUserId,
      newOwnerUserId: t.newOwnerUserId,
      overallTransferStatusCode: t.overallTransferStatusCode,
      requestTime: t.requestTime
    }));

    return {
      output: { transfers, nextPageToken: result.nextPageToken, action: 'list' },
      message: `Found **${transfers.length}** data transfers.`
    };
  })
  .build();
