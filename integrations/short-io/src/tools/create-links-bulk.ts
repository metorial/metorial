import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLinksBulk = SlateTool.create(spec, {
  name: 'Create Links in Bulk',
  key: 'create_links_bulk',
  description:
    'Create up to 1,000 short links on one domain. Each result is a link or an individual error; inspect every result because the operation can partially succeed.',
  instructions: [
    'Call list_domains to discover domain hostnames and list_folders to discover folder IDs.'
  ],
  constraints: ['Maximum 1,000 links per request. Rate limit: 5 requests per 10 seconds.'],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      domain: z
        .string()
        .optional()
        .describe('Domain hostname from list_domains. Falls back to the configured default.'),
      allowDuplicates: z
        .boolean()
        .optional()
        .describe('Allow repeated destination URLs across the batch.'),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID from list_folders for all links in this batch.'),
      links: z
        .array(
          z.object({
            originalURL: z.string().describe('Destination URL.'),
            path: z.string().optional().describe('Custom short path.'),
            title: z.string().optional().describe('Link title.'),
            tags: z.array(z.string()).optional().describe('Link tags.'),
            allowDuplicates: z
              .boolean()
              .optional()
              .describe('Override duplicate handling for this link.'),
            cloaking: z.boolean().optional().describe('Hide the destination URL.'),
            redirectType: z
              .number()
              .int()
              .refine(
                value => [301, 302, 307, 308].includes(value),
                'Use 301, 302, 307, or 308.'
              )
              .optional()
              .describe('HTTP redirect status code.'),
            password: z.string().optional().describe('Link password.'),
            iphoneURL: z.string().optional().describe('iOS destination URL.'),
            androidURL: z.string().optional().describe('Android destination URL.'),
            expiresAt: z
              .string()
              .optional()
              .describe('Expiration as ISO timestamp or milliseconds since epoch.'),
            expiredURL: z.string().optional().describe('Destination after expiration.'),
            clicksLimit: z
              .number()
              .int()
              .positive()
              .optional()
              .describe('Maximum clicks before expiration.'),
            ttl: z
              .string()
              .optional()
              .describe('Time-to-live in milliseconds or an ISO timestamp.'),
            archived: z
              .boolean()
              .optional()
              .describe('Hide the link from the dashboard while redirects remain active.'),
            skipQS: z.boolean().optional().describe('Skip query string merging.'),
            splitURL: z
              .string()
              .optional()
              .describe('Alternate destination for split testing.'),
            splitPercent: z
              .number()
              .int()
              .min(1)
              .max(100)
              .optional()
              .describe('Traffic percentage sent to splitURL.'),
            utmSource: z.string().optional().describe('UTM source.'),
            utmMedium: z.string().optional().describe('UTM medium.'),
            utmCampaign: z.string().optional().describe('UTM campaign.'),
            utmTerm: z.string().optional().describe('UTM term.'),
            utmContent: z.string().optional().describe('UTM content.')
          })
        )
        .min(1)
        .max(1000)
        .describe('Links to create. Results preserve per-item errors and successful links.')
    })
  )
  .output(
    z.object({
      results: z
        .unknown()
        .describe('Complete provider results, including successful links and per-item errors.')
    })
  )
  .handleInvocation(async ctx => {
    let domain = ctx.input.domain || ctx.config.domain;
    if (!domain)
      throw createApiServiceError(
        'Provide a domain hostname from list_domains or configure a default domain.'
      );
    let results = await new Client(ctx.auth).createLinksBulk({ ...ctx.input, domain });
    return {
      output: { results },
      message: `Processed a batch of **${ctx.input.links.length}** links. Inspect the results for individual errors.`
    };
  })
  .build();
