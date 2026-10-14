import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignPdf = SlateTool.create(spec, {
  name: 'Get Campaign PDF Report',
  key: 'get_campaign_pdf',
  description: `Download the campaign analysis as a PDF report for saving or sharing. The campaign must have completed processing before the report can be generated.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID to generate the PDF report for')
    })
  )
  .output(
    z.object({
      pdfBase64: z.string().describe('Base64-encoded PDF report content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCampaignPdfAnalysis(ctx.input.campaignId);

    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(Buffer.from(result.pdfBase64, 'base64')), {
        headers: { 'content-type': 'application/pdf' }
      }),
      filename: 'campaign-analysis.pdf'
    });

    return {
      output: {
        pdfBase64: result.pdfBase64
      },
      message: `PDF analysis report generated for campaign \`${ctx.input.campaignId}\`.`
    };
  })
  .build();
