import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchConsoleClient } from '../lib/client';
import { googleSearchConsoleActionScopes } from '../scopes';
import { spec } from '../spec';

export let inspectUrl = SlateTool.create(spec, {
  name: 'Inspect URL',
  key: 'inspect_url',
  description: `Inspect a URL's indexing status and related data in Google Search Console. Returns information about the indexed version of the URL, including index status, AMP results, mobile usability, and rich results.`,
  instructions: [
    'The URL must belong to the specified site property.',
    'This only checks the currently indexed version — it does not test or submit the live URL for indexing.'
  ],
  constraints: ['Limited to 2,000 queries per day and 600 queries per minute per property.'],
  tags: {
    readOnly: true
  }
})
  .scopes(googleSearchConsoleActionScopes.inspectUrl)
  .input(
    z.object({
      inspectionUrl: z.string().describe('The fully-qualified URL to inspect'),
      siteUrl: z.string().describe('The site URL as defined in Search Console'),
      languageCode: z
        .string()
        .optional()
        .describe(
          'IETF BCP-47 language code for translated issue messages (e.g., "en-US"). Defaults to "en-US"'
        )
    })
  )
  .output(
    z.object({
      inspectionResultLink: z
        .string()
        .optional()
        .describe('Link to the URL Inspection result in Search Console'),
      indexStatusResult: z
        .object({
          verdict: z
            .string()
            .optional()
            .describe('Overall verdict: PASS, PARTIAL, FAIL, or NEUTRAL'),
          coverageState: z.string().optional().describe('Coverage state description'),
          robotsTxtState: z
            .string()
            .optional()
            .describe('Whether robots.txt allows crawling: ALLOWED or DISALLOWED'),
          indexingState: z
            .string()
            .optional()
            .describe(
              'Whether indexing is allowed: INDEXING_ALLOWED, BLOCKED_BY_META_TAG, or BLOCKED_BY_HTTP_HEADER'
            ),
          lastCrawlTime: z.string().optional().describe('Timestamp of last crawl'),
          pageFetchState: z
            .string()
            .optional()
            .describe(
              'Page fetch status: SUCCESSFUL, SOFT_404, NOT_FOUND, SERVER_ERROR, etc.'
            ),
          googleCanonical: z
            .string()
            .optional()
            .describe('The canonical URL selected by Google'),
          userCanonical: z
            .string()
            .optional()
            .describe('The canonical URL declared by the user'),
          sitemap: z.array(z.string()).optional().describe('Sitemaps that reference this URL'),
          referringUrls: z
            .array(z.string())
            .optional()
            .describe('URLs that link to this page'),
          crawledAs: z.string().optional().describe('Crawler type used: DESKTOP or MOBILE')
        })
        .optional()
        .describe('Index status information'),
      ampResult: z
        .object({
          verdict: z
            .string()
            .optional()
            .describe('AMP verdict: PASS, PARTIAL, FAIL, or NEUTRAL'),
          ampUrl: z.string().optional().describe('The AMP URL'),
          robotsTxtState: z.string().optional(),
          indexingState: z.string().optional(),
          ampIndexStatusVerdict: z.string().optional(),
          lastCrawlTime: z.string().optional(),
          pageFetchState: z.string().optional(),
          issues: z
            .array(
              z.object({
                issueMessage: z.string().optional(),
                severity: z.string().optional()
              })
            )
            .optional()
            .describe('AMP issues found')
        })
        .optional()
        .describe('AMP validation results'),
      mobileUsabilityResult: z
        .object({
          verdict: z.string().optional().describe('Mobile usability verdict'),
          issues: z
            .array(
              z.object({
                issueType: z.string().optional().describe('Issue type identifier'),
                severity: z.string().optional().describe('Issue severity: WARNING or ERROR'),
                message: z.string().optional().describe('Issue description')
              })
            )
            .optional()
            .describe('Mobile usability issues found')
        })
        .optional()
        .describe('Mobile usability results'),
      richResultsResult: z
        .object({
          verdict: z.string().optional().describe('Rich results verdict'),
          detectedItems: z
            .array(
              z.object({
                richResultType: z.string().optional().describe('Type of rich result detected'),
                items: z
                  .array(
                    z.object({
                      name: z.string().optional().describe('Item name'),
                      issues: z
                        .array(
                          z.object({
                            issueMessage: z.string().optional(),
                            severity: z.string().optional()
                          })
                        )
                        .optional()
                        .describe('Issues for this item')
                    })
                  )
                  .optional()
                  .describe('Detected items of this type')
              })
            )
            .optional()
            .describe('Detected rich result types')
        })
        .optional()
        .describe('Rich results analysis')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchConsoleClient(ctx.auth.token);

    let result = await client.inspectUrl({
      inspectionUrl: ctx.input.inspectionUrl,
      siteUrl: ctx.input.siteUrl,
      languageCode: ctx.input.languageCode
    });

    let verdict = result.indexStatusResult?.verdict || 'UNKNOWN';
    let coverage = result.indexStatusResult?.coverageState || 'unknown';

    return {
      output: result,
      message: `URL **${ctx.input.inspectionUrl}** — index verdict: **${verdict}**, coverage: **${coverage}**, crawled as: **${result.indexStatusResult?.crawledAs || 'unknown'}**.`
    };
  })
  .build();
