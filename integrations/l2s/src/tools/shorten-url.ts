import { SlateTool } from 'slates';
import { z } from 'zod';
import { L2sClient } from '../lib/client';
import { spec } from '../spec';

export let shortenUrl = SlateTool.create(spec, {
  name: 'Shorten URL',
  key: 'shorten_url',
  description: `Create a shortened URL from a long URL. Supports custom aliases, UTM tracking parameters, titles, and tags for organization. Returns the shortened link and its metadata.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The long URL to shorten'),
      customKey: z
        .string()
        .optional()
        .describe(
          'Custom alias/slug for the shortened URL (e.g., "my-brand" becomes l2s.is/my-brand)'
        ),
      title: z.string().optional().describe('Descriptive title for the shortened URL'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags for categorizing and organizing the link'),
      utmSource: z.string().optional().describe('UTM source tracking parameter'),
      utmMedium: z.string().optional().describe('UTM medium tracking parameter'),
      utmCampaign: z.string().optional().describe('UTM campaign tracking parameter'),
      utmTerm: z.string().optional().describe('UTM term tracking parameter'),
      utmContent: z.string().optional().describe('UTM content tracking parameter')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the operation was successful'),
      message: z.string().describe('Status message from the API'),
      urlData: z.any().describe('Shortened URL data including key, destination, and metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new L2sClient({ token: ctx.auth.token });

    let result = await client.shortenUrl({
      url: ctx.input.url,
      customKey: ctx.input.customKey,
      title: ctx.input.title,
      tags: ctx.input.tags,
      utmSource: ctx.input.utmSource,
      utmMedium: ctx.input.utmMedium,
      utmCampaign: ctx.input.utmCampaign,
      utmTerm: ctx.input.utmTerm,
      utmContent: ctx.input.utmContent
    });

    let shortUrl = result.response?.data?.key
      ? `https://l2s.is/${result.response.data.key}`
      : undefined;

    return {
      output: {
        ok: result.ok,
        message: result.response?.message ?? 'URL shortened',
        urlData: result.response?.data
      },
      message: shortUrl
        ? `Shortened URL created: **${shortUrl}** pointing to ${ctx.input.url}`
        : `URL shortening completed. Status: ${result.response?.message ?? 'success'}`
    };
  })
  .build();
