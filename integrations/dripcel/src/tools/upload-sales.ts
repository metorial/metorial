import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadSales = SlateTool.create(spec, {
  name: 'Upload Sales',
  key: 'upload_sales',
  description: `Upload sale conversions to Dripcel in bulk. Each sale is associated with a campaign and a contact cell number. Duplicate sales (same cell, campaign, and date) are rejected.`,
  constraints: [
    'Duplicate sales with the same cell, campaign_id, and soldAt date are rejected (HTTP 409).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sales: z
        .array(
          z.object({
            campaignId: z.string().describe('Campaign ID to associate the sale with'),
            cell: z.string().describe('Contact cell number (local or international format)'),
            sendId: z.string().optional().describe('Associated send ID'),
            clickId: z.string().optional().describe('Associated click ID'),
            soldAt: z
              .string()
              .optional()
              .describe('Sale date in ISO format (YYYY-MM-DD). Defaults to current date.'),
            saleValue: z
              .number()
              .optional()
              .describe("Sale amount. Defaults to campaign's defaultSaleValue.")
          })
        )
        .describe('Array of sale conversion records to upload')
    })
  )
  .output(
    z.object({
      uploaded: z.boolean().describe('Whether the sales were uploaded successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.uploadSales(ctx.input.sales);
    return {
      output: { uploaded: true },
      message: `Uploaded **${ctx.input.sales.length}** sale conversion(s).`
    };
  })
  .build();
