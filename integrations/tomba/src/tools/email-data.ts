import { SlateTool } from 'slates';
import { z } from 'zod';
import { TombaClient } from '../lib/client';
import { spec } from '../spec';

export let getEmailFormats = SlateTool.create(spec, {
  name: 'Get Email Formats',
  key: 'get_email_formats',
  description:
    'Get the email address patterns used by a company domain and the percentage of known addresses using each pattern. This request consumes email count credits even when no patterns are found.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Company domain, such as stripe.com')
    })
  )
  .output(
    z.object({
      domain: z.string().describe('Requested company domain'),
      formats: z
        .array(
          z.object({
            format: z.string().describe('Email pattern, such as {first}.{last}'),
            percentage: z.number().describe('Percentage of known addresses using this pattern')
          })
        )
        .describe('Known email patterns; empty when no patterns are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient(ctx.auth);
    let result = await client.emailFormats(ctx.input.domain);
    let formats = result.data ?? [];

    return {
      output: {
        domain: ctx.input.domain,
        formats
      },
      message: `Found **${formats.length}** email patterns for **${ctx.input.domain}**.`
    };
  })
  .build();

export let getEmailSources = SlateTool.create(spec, {
  name: 'Get Email Sources',
  key: 'get_email_sources',
  description:
    'Find the public web pages where an email address was discovered, with extraction dates and whether the address is still on each page.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      email: z.string().describe('Email address to look up')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Requested email address'),
      sources: z
        .array(
          z.object({
            uri: z.string().nullable().optional().describe('Page URL'),
            websiteUrl: z.string().nullable().optional().describe('Source website'),
            extractedOn: z.string().nullable().optional().describe('First extraction date'),
            lastSeenOn: z.string().nullable().optional().describe('Most recent sighting date'),
            stillOnPage: z
              .boolean()
              .nullable()
              .optional()
              .describe('Whether the email remains on the page')
          })
        )
        .describe('Public sources; empty when no sources are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TombaClient(ctx.auth);
    let result = await client.emailSources(ctx.input.email);
    let data = result.data;
    let sources = (Array.isArray(data) ? data : (data?.sources ?? [])).map((source: any) => ({
      uri: source.uri,
      websiteUrl: source.website_url,
      extractedOn: source.extracted_on,
      lastSeenOn: source.last_seen_on,
      stillOnPage: source.still_on_page
    }));

    return {
      output: {
        email: data?.email ?? result.email ?? ctx.input.email,
        sources
      },
      message: `Found **${sources.length}** sources for **${ctx.input.email}**.`
    };
  })
  .build();
