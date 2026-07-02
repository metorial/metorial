import { SlateTool } from 'slates';
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
      courierFields: z.any().optional().describe('Required fields for the specified courier'),
      orderPackages: z.any().optional().describe('Existing packages for the specified order'),
      packageStatusHistory: z
        .any()
        .optional()
        .describe('Status history for the specified packages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    let couriersResult = await client.getCouriersList();
    let courierFields: any;
    let orderPackages: any;
    let packageStatusHistory: any;

    if (ctx.input.courierCodeForFields) {
      let fieldsResult = await client.getCourierFields(ctx.input.courierCodeForFields);
      courierFields = fieldsResult;
    }

    if (ctx.input.orderIdForPackages) {
      let packagesResult = await client.getOrderPackages(ctx.input.orderIdForPackages);
      orderPackages = packagesResult;
    }

    if (ctx.input.packageIdsForStatus && ctx.input.packageIdsForStatus.length > 0) {
      let statusResult = await client.getCourierPackagesStatusHistory(
        ctx.input.packageIdsForStatus
      );
      packageStatusHistory = statusResult;
    }

    let couriers = couriersResult.couriers || [];

    return {
      output: { couriers, courierFields, orderPackages, packageStatusHistory },
      message: `Found **${Array.isArray(couriers) ? couriers.length : Object.keys(couriers).length}** courier(s) available.`
    };
  })
  .build();
