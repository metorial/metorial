import { SlateTool } from 'slates';
import { z } from 'zod';
import { StockClient } from '../lib/stock';
import { spec } from '../spec';

export let licenseStock = SlateTool.create(spec, {
  name: 'License Stock Asset',
  key: 'license_stock',
  description: `License an Adobe Stock asset for use. Retrieves the license info and initiates licensing. Also can check the current license status of an asset before licensing.`,
  instructions: [
    'First search for an asset using the Search Stock tool, then use this tool with the content ID to license it.'
  ]
})
  .input(
    z.object({
      contentId: z.string().describe('Adobe Stock content ID to license'),
      action: z
        .enum(['license', 'check'])
        .describe('Whether to license the asset or just check its license status'),
      licenseState: z.string().optional().describe('License state to apply (e.g. "Standard")')
    })
  )
  .output(
    z.object({
      contentId: z.string().describe('Content ID'),
      isLicensed: z.boolean().describe('Whether the asset is now licensed'),
      downloadUrl: z.string().optional().describe('URL to download the licensed asset'),
      purchaseDetails: z.any().optional().describe('Purchase and entitlement details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StockClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      orgId: ctx.auth.orgId
    });

    if (ctx.input.action === 'check') {
      let result = await client.getLicenseInfo(ctx.input.contentId);
      let content = result.contents?.[ctx.input.contentId] || {};
      return {
        output: {
          contentId: ctx.input.contentId,
          isLicensed: content.purchase_details?.state === 'purchased' || false,
          purchaseDetails: content.purchase_details
        },
        message: `License status for asset \`${ctx.input.contentId}\`: **${content.purchase_details?.state || 'not licensed'}**`
      };
    }

    let result = await client.licenseContent(ctx.input.contentId, ctx.input.licenseState);
    let content = result.contents?.[ctx.input.contentId] || {};

    return {
      output: {
        contentId: ctx.input.contentId,
        isLicensed: true,
        downloadUrl: content.purchase_details?.url,
        purchaseDetails: content.purchase_details
      },
      message: `Successfully licensed stock asset \`${ctx.input.contentId}\`.`
    };
  })
  .build();
