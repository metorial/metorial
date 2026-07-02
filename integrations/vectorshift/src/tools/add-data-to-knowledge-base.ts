import { SlateTool } from 'slates';
import { z } from 'zod';
import { addTextToKnowledgeBase, addUrlToKnowledgeBase, createApiClient } from '../lib/client';
import { spec } from '../spec';

export let addDataToKnowledgeBaseTool = SlateTool.create(spec, {
  name: 'Add Data to Knowledge Base',
  key: 'add_data_to_knowledge_base',
  description: `Add data to an existing knowledge base. Supports adding content via URL (with optional recursive crawling) or plain text. The data will be processed, chunked, and indexed for semantic search.`,
  instructions: [
    'Provide either a URL or text content, not both.',
    'For URLs, enable recursive crawling to index linked pages.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('ID of the knowledge base to add data to'),
      sourceType: z.enum(['url', 'text']).describe('Type of data source to add'),
      url: z
        .string()
        .optional()
        .describe('URL to scrape and index (required when sourceType is "url")'),
      recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe('Crawl and index linked pages from the URL'),
      urlLimit: z
        .number()
        .optional()
        .describe('Maximum number of pages to scrape when recursive is enabled'),
      rescrapeFrequency: z
        .enum(['never', 'daily', 'weekly', 'monthly'])
        .optional()
        .default('never')
        .describe('How often to re-scrape the URL content'),
      text: z
        .string()
        .optional()
        .describe('Plain text content to index (required when sourceType is "text")'),
      fileName: z.string().optional().describe('File name for the text document')
    })
  )
  .output(
    z.object({
      documentIds: z.array(z.string()).describe('IDs of the created documents')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result: { document_ids?: string[] };

    if (ctx.input.sourceType === 'url') {
      if (!ctx.input.url) {
        throw new Error('URL is required when sourceType is "url"');
      }
      result = await addUrlToKnowledgeBase(api, ctx.input.knowledgeBaseId, {
        url: ctx.input.url,
        recursive: ctx.input.recursive,
        urlLimit: ctx.input.urlLimit,
        rescrapeFrequency: ctx.input.rescrapeFrequency
      });
    } else {
      if (!ctx.input.text) {
        throw new Error('Text content is required when sourceType is "text"');
      }
      result = await addTextToKnowledgeBase(api, ctx.input.knowledgeBaseId, {
        text: ctx.input.text,
        fileName: ctx.input.fileName
      });
    }

    let documentIds = result.document_ids ?? [];

    return {
      output: { documentIds },
      message: `Added **${documentIds.length}** document(s) to knowledge base \`${ctx.input.knowledgeBaseId}\`.`
    };
  })
  .build();
