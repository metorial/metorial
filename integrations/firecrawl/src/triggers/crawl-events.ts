import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let pageMetadataSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    language: z.string().optional(),
    sourceURL: z.string().optional(),
    statusCode: z.number().optional()
  })
  .optional();

export let crawlEventsTrigger = SlateTrigger.create(spec, {
  name: 'Crawl Events',
  key: 'crawl_events',
  description:
    'Receives webhook events for crawl jobs — started, page scraped, completed, and failed. Configure the webhook URL when starting a crawl job.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of crawl event'),
      crawlId: z.string().describe('ID of the crawl job'),
      pageData: z
        .object({
          markdown: z.string().optional(),
          html: z.string().optional(),
          links: z.array(z.string()).optional(),
          metadata: pageMetadataSchema
        })
        .optional()
        .describe('Page data for crawl.page events'),
      error: z.string().optional().describe('Error message for failed events'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata passed when creating the crawl')
    })
  )
  .output(
    z.object({
      crawlId: z.string().describe('ID of the crawl job'),
      markdown: z.string().optional().describe('Scraped page content as markdown'),
      html: z.string().optional().describe('Scraped page HTML'),
      links: z.array(z.string()).optional().describe('Links found on the page'),
      pageTitle: z.string().optional().describe('Title of the scraped page'),
      pageUrl: z.string().optional().describe('URL of the scraped page'),
      statusCode: z.number().optional().describe('HTTP status code of the scraped page'),
      error: z.string().optional().describe('Error message if the crawl failed'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata from the crawl job')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.type ?? 'unknown';
      let crawlId = body.id ?? '';
      let pageData = body.data
        ? Array.isArray(body.data)
          ? body.data[0]
          : body.data
        : undefined;

      return {
        inputs: [
          {
            eventType,
            crawlId,
            pageData: pageData
              ? {
                  markdown: pageData.markdown,
                  html: pageData.html,
                  links: pageData.links,
                  metadata: pageData.metadata
                    ? {
                        title: pageData.metadata.title,
                        description: pageData.metadata.description,
                        language: pageData.metadata.language,
                        sourceURL: pageData.metadata.sourceURL ?? pageData.metadata.url,
                        statusCode: pageData.metadata.statusCode
                      }
                    : undefined
                }
              : undefined,
            error: body.error,
            metadata: body.metadata
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let uniqueId = `${ctx.input.crawlId}-${ctx.input.eventType}`;
      if (ctx.input.eventType === 'crawl.page' && ctx.input.pageData?.metadata?.sourceURL) {
        uniqueId = `${ctx.input.crawlId}-page-${ctx.input.pageData.metadata.sourceURL}`;
      }

      return {
        type: ctx.input.eventType,
        id: uniqueId,
        output: {
          crawlId: ctx.input.crawlId,
          markdown: ctx.input.pageData?.markdown,
          html: ctx.input.pageData?.html,
          links: ctx.input.pageData?.links,
          pageTitle: ctx.input.pageData?.metadata?.title,
          pageUrl: ctx.input.pageData?.metadata?.sourceURL,
          statusCode: ctx.input.pageData?.metadata?.statusCode,
          error: ctx.input.error,
          metadata: ctx.input.metadata
        }
      };
    }
  });
