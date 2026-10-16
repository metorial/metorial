import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BaseLinkerClient } from '../lib/client';
import { spec } from '../spec';

export let downloadShippingLabel = SlateTool.create(spec, {
  name: 'Download Shipping Label',
  key: 'download_shipping_label',
  description:
    'Download the shipping label for a courier shipment. Call get_couriers with orderIdForPackages to discover shipment IDs and courier codes.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      courierCode: z.string().describe('Courier code from get_couriers'),
      packageId: z
        .number()
        .optional()
        .describe('Shipment ID from get_couriers; supply this or packageNumber'),
      packageNumber: z
        .string()
        .optional()
        .describe('Tracking number; supply this or packageId')
    })
  )
  .output(
    z.object({
      extension: z.string().describe('Label file extension returned by the courier'),
      filename: z.string().describe('Download filename')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.packageId === undefined && !ctx.input.packageNumber?.trim()) {
      throw createApiServiceError('Provide packageId or packageNumber.');
    }
    let client = new BaseLinkerClient({ token: ctx.auth.token });
    let result = await client.getLabel(
      ctx.input.courierCode,
      ctx.input.packageId,
      ctx.input.packageNumber
    );
    if (
      typeof result.extension !== 'string' ||
      !/^[a-z0-9]+$/i.test(result.extension) ||
      typeof result.label !== 'string' ||
      !result.label.length
    ) {
      throw createApiServiceError('BaseLinker did not return a downloadable shipping label.');
    }
    let mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      html: 'text/html',
      gif: 'image/gif',
      png: 'image/png',
      epl: 'text/plain',
      zpl: 'text/plain',
      dpl: 'text/plain'
    };
    let filename = `shipping-label.${result.extension}`;
    let content = Buffer.from(result.label, 'base64');
    if (!content.length)
      throw createApiServiceError('BaseLinker returned an empty shipping label.');
    await ctx.addAttachment({
      type: 'content',
      content: new Response(content, {
        headers: {
          'Content-Type':
            mimeTypes[result.extension.toLowerCase()] ?? 'application/octet-stream'
        }
      }),
      filename
    });
    return {
      output: { extension: result.extension, filename },
      message: 'Prepared the shipping label for download.'
    };
  })
  .build();
