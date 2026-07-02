import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeliveries = SlateTool.create(spec, {
  name: 'List Deliveries',
  key: 'list_deliveries',
  description: `List all delivery configurations for a template. Deliveries define where generated documents are automatically sent (email, webhook, cloud storage, eSignature, etc.).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template to list deliveries for'),
      deliveryType: z
        .enum([
          'email',
          'webhook',
          'signature',
          'sftp',
          'dropbox',
          'google_drive',
          'one_drive',
          'docu_sign',
          'hellosign',
          'sign_now',
          'eversign',
          'signable',
          'yousign',
          'aws_s3',
          'azure_blob_storage',
          'box_drive'
        ])
        .optional()
        .describe('Filter by delivery type')
    })
  )
  .output(
    z.object({
      deliveries: z.array(
        z.object({
          deliveryId: z.number().describe('Unique delivery ID'),
          name: z.string().describe('Delivery name'),
          type: z.string().describe('Delivery type (email, webhook, google_drive, etc.)'),
          isActive: z.boolean().describe('Whether the delivery is active')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let deliveries = await client.listDeliveries(ctx.input.templateId, {
      type: ctx.input.deliveryType
    });

    return {
      output: {
        deliveries: deliveries.map(d => ({
          deliveryId: d.id,
          name: d.name,
          type: d.type,
          isActive: d.is_active
        }))
      },
      message: `Found **${deliveries.length}** delivery configuration(s) for template ${ctx.input.templateId}.`
    };
  })
  .build();

export let getDelivery = SlateTool.create(spec, {
  name: 'Get Delivery',
  key: 'get_delivery',
  description: `Get the full configuration details of a specific delivery for a template.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template'),
      deliveryId: z.number().describe('ID of the delivery to retrieve')
    })
  )
  .output(
    z.object({
      deliveryId: z.number().describe('Unique delivery ID'),
      name: z.string().describe('Delivery name'),
      type: z.string().describe('Delivery type'),
      isActive: z.boolean().describe('Whether the delivery is active'),
      configuration: z.record(z.string(), z.unknown()).describe('Full delivery configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let delivery = await client.getDelivery(ctx.input.templateId, ctx.input.deliveryId);

    return {
      output: {
        deliveryId: delivery.id,
        name: delivery.name,
        type: delivery.type,
        isActive: delivery.is_active,
        configuration: { ...delivery } as Record<string, unknown>
      },
      message: `Retrieved delivery **"${delivery.name}"** (type: ${delivery.type}, active: ${delivery.is_active}).`
    };
  })
  .build();

export let deleteDelivery = SlateTool.create(spec, {
  name: 'Delete Delivery',
  key: 'delete_delivery',
  description: `Delete a delivery configuration from a template. Generated documents will no longer be sent to this destination.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      templateId: z.number().describe('ID of the template'),
      deliveryId: z.number().describe('ID of the delivery to delete')
    })
  )
  .output(
    z.object({
      deliveryId: z.number().describe('ID of the deleted delivery'),
      deleted: z.boolean().describe('Whether the delivery was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    await client.deleteDelivery(ctx.input.templateId, ctx.input.deliveryId);

    return {
      output: {
        deliveryId: ctx.input.deliveryId,
        deleted: true
      },
      message: `Deleted delivery (ID: ${ctx.input.deliveryId}) from template ${ctx.input.templateId}.`
    };
  })
  .build();
