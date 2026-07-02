import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportReportPdf = SlateTool.create(spec, {
  name: 'Export Report PDF',
  key: 'export_report_pdf',
  description: `Generate a downloadable PDF version of an influencer report. Supports all platforms: Instagram, YouTube, TikTok, Twitter/X, Twitch, and Snapchat. The PDF URL is valid for 28 days.`,
  constraints: [
    'Requesting a PDF for a locked report will automatically unlock it (consuming a credit).',
    'PDF generation is asynchronous. If the PDF is not ready, a retryTtl value is returned indicating when to try again.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z
        .enum(['instagram', 'youtube', 'tiktok', 'twitter', 'twitch', 'snapchat'])
        .describe('Social media platform'),
      username: z.string().describe('Username or channel name/ID of the influencer')
    })
  )
  .output(
    z.object({
      pdfUrl: z.string().optional().describe('URL to download the PDF (valid for 28 days)'),
      retryTtl: z
        .number()
        .optional()
        .describe('Seconds to wait before retrying if PDF is still generating'),
      isReady: z.boolean().describe('Whether the PDF is ready for download'),
      remainingCredits: z.number().optional().describe('Remaining report credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let response: any;

    switch (ctx.input.platform) {
      case 'instagram':
        response = await client.getInstagramPdf(ctx.input.username);
        break;
      case 'youtube':
        response = await client.getYoutubePdf(ctx.input.username);
        break;
      case 'tiktok':
        response = await client.getTiktokPdf(ctx.input.username);
        break;
      case 'twitter':
        response = await client.getTwitterPdf(ctx.input.username);
        break;
      case 'twitch':
        response = await client.getTwitchPdf(ctx.input.username);
        break;
      case 'snapchat':
        response = await client.getSnapchatPdf(ctx.input.username);
        break;
    }

    let result = response?.result;

    if (result?.pdfUrl) {
      return {
        output: {
          pdfUrl: result.pdfUrl,
          retryTtl: undefined,
          isReady: true,
          remainingCredits: result.restTokens
        },
        message: `PDF report for **${ctx.input.username}** is ready: [Download PDF](${result.pdfUrl})`
      };
    }

    return {
      output: {
        pdfUrl: undefined,
        retryTtl: result?.retryTtl,
        isReady: false,
        remainingCredits: result?.restTokens
      },
      message: `PDF is still generating. Retry in **${result?.retryTtl ?? 30}** seconds.`
    };
  })
  .build();
