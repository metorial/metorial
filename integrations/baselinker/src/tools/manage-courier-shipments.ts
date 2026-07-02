import { SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let manageCourierShipments = SlateTool.create(spec, {
  name: 'Create Courier Shipment',
  key: 'create_courier_shipment',
  description: `Create a courier shipment package for an order. Can create via courier API integration or manually. Returns the package ID and tracking number. Use the Get Couriers tool first to find available couriers and their required fields.`,
  instructions: [
    'Use "getCourierFields" (via Get Couriers tool) to discover which fields each courier requires before creating a package.',
    'Weight is in kilograms, dimensions (sizeX, sizeY, sizeZ) are in centimeters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('Order ID to ship'),
      courierCode: z.string().describe('Courier code (from Get Couriers tool)'),
      manual: z
        .boolean()
        .optional()
        .describe('If true, create a manual package entry instead of using the courier API'),
      accountId: z
        .number()
        .optional()
        .describe('Courier API account ID (optional, uses first account if omitted)'),
      fields: z
        .array(
          z.object({
            fieldId: z.string().describe('Field ID from getCourierFields'),
            fieldValue: z.string().describe('Field value')
          })
        )
        .optional()
        .describe('Courier-specific form fields'),
      packages: z
        .array(
          z.object({
            weight: z.number().describe('Package weight in kg'),
            sizeX: z.number().optional().describe('Package width in cm'),
            sizeY: z.number().optional().describe('Package height in cm'),
            sizeZ: z.number().optional().describe('Package length in cm')
          })
        )
        .optional()
        .describe('List of packages with dimensions'),
      packageNumber: z
        .string()
        .optional()
        .describe('Tracking number (required for manual shipments)'),
      pickupDate: z
        .number()
        .optional()
        .describe('Pickup date as unix timestamp (manual shipments)')
    })
  )
  .output(
    z.object({
      packageId: z.number().optional().describe('Created package ID'),
      packageNumber: z.string().optional().describe('Shipping/tracking number'),
      courierInnerNumber: z.string().optional().describe('Courier internal number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BaseLinkerClient({ token: ctx.auth.token });

    if (ctx.input.manual) {
      let result = await client.createPackageManual({
        orderId: ctx.input.orderId,
        courierCode: ctx.input.courierCode,
        packageNumber: ctx.input.packageNumber!,
        pickupDate: ctx.input.pickupDate
      });

      return {
        output: {
          packageId: result.package_id,
          packageNumber: ctx.input.packageNumber
        },
        message: `Manually added shipment **${ctx.input.packageNumber}** (${ctx.input.courierCode}) to order **#${ctx.input.orderId}**.`
      };
    }

    let result = await client.createPackage({
      orderId: ctx.input.orderId,
      courierCode: ctx.input.courierCode,
      accountId: ctx.input.accountId,
      fields: ctx.input.fields?.map(f => ({ id: f.fieldId, value: f.fieldValue })),
      packages: ctx.input.packages || []
    });

    return {
      output: {
        packageId: result.package_id,
        packageNumber: result.package_number || '',
        courierInnerNumber: result.courier_inner_number || ''
      },
      message: `Created shipment via **${ctx.input.courierCode}** for order **#${ctx.input.orderId}**. Tracking: ${result.package_number || 'N/A'}.`
    };
  })
  .build();
