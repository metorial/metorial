import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let getCouriers = SlateTool.create(spec, {
  name: 'Get Couriers',
  key: 'get_couriers',
  description: `Retrieve available courier integrations and their configuration. Lists all active couriers on the account. Optionally fetches the form fields required for a specific courier when creating shipments. Also can retrieve shipment packages and their status history for an order.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courierCodeForAccounts: z
        .string()
        .optional()
        .describe('Courier code to discover available API accounts'),
      courierCodeForFields: z
        .string()
        .optional()
        .describe('Courier code to fetch required fields for package creation'),
      orderIdForPackages: z
        .number()
        .optional()
        .describe('Order ID to fetch existing shipment packages for'),
      packageIdsForStatus: z
        .array(z.number())
        .optional()
        .describe('Package IDs to fetch status history for')
    })
  )
  .output(
    z.object({
      couriers: z.any().describe('List of available couriers with codes and names'),
      courierAccounts: z
        .any()
        .optional()
        .describe('Available accounts for the selected courier'),
      courierFields: z.any().optional().describe('Required fields for the specified courier'),
      orderPackages: z.any().optional().describe('Existing packages for the specified order'),
      packageStatusHistory: z
        .any()
        .optional()
        .describe('Status history for the specified packages')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.packageIdsForStatus && ctx.input.packageIdsForStatus.length > 100) {
      throw createApiServiceError(
        'Status history supports at most 100 package IDs per request.'
      );
    }
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    let couriersResult = await client.getCouriersList();
    let courierFields: any;
    let courierAccounts: any;
    let orderPackages: any;
    let packageStatusHistory: any;

    if (ctx.input.courierCodeForAccounts) {
      courierAccounts = (await client.getCourierAccounts(ctx.input.courierCodeForAccounts))
        .accounts;
    }
    if (ctx.input.courierCodeForFields) {
      let fieldsResult = await client.getCourierFields(ctx.input.courierCodeForFields);
      courierFields = fieldsResult;
    }

    if (ctx.input.orderIdForPackages !== undefined) {
      let packagesResult = await client.getOrderPackages(ctx.input.orderIdForPackages);
      orderPackages = packagesResult;
    }

    if (ctx.input.packageIdsForStatus && ctx.input.packageIdsForStatus.length > 0) {
      let statusResult = await client.getCourierPackagesStatusHistory(
        ctx.input.packageIdsForStatus
      );
      packageStatusHistory = statusResult;
    }

    let couriers = couriersResult.couriers;

    return {
      output: {
        couriers,
        courierFields,
        courierAccounts,
        orderPackages,
        packageStatusHistory
      },
      message: `Found **${Array.isArray(couriers) ? couriers.length : Object.keys(couriers).length}** courier(s) available.`
    };
  })
  .build();
