import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let urlInfoTool = SlateTool.create(spec, {
  name: 'URL Info',
  key: 'url_info',
  description: `Analyze a URL to retrieve metadata including HTTP status, page title, content type, server information, and geographic location. Optionally fetch the page content for further processing.`,
  constraints: ['Rate limited to 2 requests per second'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to analyze'),
      fetchContent: z
        .boolean()
        .optional()
        .describe('Fetch and return the actual page content'),
      ignoreCertificateErrors: z
        .boolean()
        .optional()
        .describe('Bypass TLS/SSL certificate validation'),
      timeout: z.number().optional().describe('Request timeout in seconds (default 60)')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the URL is valid and accessible'),
      url: z.string().describe('The final resolved URL'),
      httpStatus: z.number().describe('HTTP status code'),
      httpStatusMessage: z.string().describe('HTTP status message'),
      contentType: z.string().describe('Content-Type header value'),
      contentLength: z.number().describe('Content length in bytes'),
      title: z.string().describe('Page title'),
      language: z.string().describe('Detected page language'),
      serverIp: z.string().describe('Server IP address'),
      serverHostname: z.string().describe('Server hostname'),
      serverCountry: z.string().describe('Server country name'),
      serverCountryCode: z.string().describe('Server country ISO code'),
      loadTime: z.number().describe('Page load time in seconds'),
      isTimeout: z.boolean().describe('Whether the request timed out'),
      content: z.string().describe('Page content (if fetchContent was enabled)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.urlInfo({
      url: ctx.input.url,
      fetchContent: ctx.input.fetchContent,
      ignoreCertificateErrors: ctx.input.ignoreCertificateErrors,
      timeout: ctx.input.timeout
    });

    return {
      output: {
        valid: result.valid ?? false,
        url: result.url ?? ctx.input.url,
        httpStatus: result.httpStatus ?? 0,
        httpStatusMessage: result.httpStatusMessage ?? '',
        contentType: result.contentType ?? '',
        contentLength: result.contentLength ?? 0,
        title: result.title ?? '',
        language: result.language ?? '',
        serverIp: result.serverIp ?? '',
        serverHostname: result.serverHostname ?? '',
        serverCountry: result.serverCountry ?? '',
        serverCountryCode: result.serverCountryCode ?? '',
        loadTime: result.loadTime ?? 0,
        isTimeout: result.isTimeout ?? false,
        content: result.content ?? ''
      },
      message: result.valid
        ? `**${result.title || result.url}** — HTTP ${result.httpStatus} (${result.contentType}). Server: ${result.serverHostname || result.serverIp} in ${result.serverCountry || 'unknown'}. Load time: ${result.loadTime}s.`
        : `Unable to access **${ctx.input.url}**.${result.isTimeout ? ' Request timed out.' : ''}`
    };
  })
  .build();
