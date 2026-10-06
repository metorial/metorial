import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { articlePayload } from '../lib/payloads';
import { mapArticle } from '../lib/schemas';
import { apiError, fail, integer, required } from '../lib/validation';
import { spec } from '../spec';

let priceSchema = z
  .object({
    netPrice: z.number().optional().describe('Net price of the article'),
    grossPrice: z.number().optional().describe('Gross price of the article'),
    taxRatePercentage: z
      .enum(['0', '7', '19'])
      .optional()
      .describe('Tax rate percentage (0, 7, or 19)'),
    leadingPrice: z
      .enum(['net', 'gross'])
      .optional()
      .describe('Whether net or gross is the leading price')
  })
  .optional()
  .describe('Pricing information for the article');

let articleOutputSchema = z.object({
  id: z.string().optional().describe('Unique article ID'),
  resourceUri: z.string().optional().describe('Resource URI of the article'),
  title: z.string().optional().describe('Article title'),
  description: z.string().optional().describe('Article description'),
  type: z.string().optional().describe('Article type: product or service'),
  articleNumber: z.string().optional().describe('Article number'),
  gtin: z.string().optional().describe('Global Trade Item Number'),
  note: z.string().optional().describe('Internal note'),
  unitName: z.string().optional().describe('Unit name (e.g. Stück)'),
  price: z
    .object({
      netPrice: z.number().optional(),
      grossPrice: z.number().optional(),
      taxRatePercentage: z.number().optional(),
      leadingPrice: z.string().optional()
    })
    .optional()
    .describe('Pricing details'),
  version: z.number().optional().describe('Article version for optimistic locking'),
  createdDate: z.string().optional().describe('Creation date'),
  updatedDate: z.string().optional().describe('Last updated date'),
  deleted: z.boolean().optional().describe('Whether the article was deleted')
});

export let manageArticle = SlateTool.create(spec, {
  name: 'Manage Article',
  key: 'manage_article',
  description: `Create, retrieve, update, or delete articles (products or services) in Lexoffice. Articles represent goods or services that can be used on invoices and other vouchers.`,
  instructions: [
    'Use action "create" to add a new article — title, type, unitName and complete price are required.',
    'Use action "get" to retrieve full details of an article by its ID.',
    'Use action "update" to modify an existing article — articleId is required; unchanged fields are preserved with the current version.',
    'Use action "delete" to permanently remove an article — articleId is required.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete'])
        .describe('Operation to perform on the article'),
      articleId: z
        .string()
        .optional()
        .describe('Article ID (required for get, update, delete)'),
      title: z.string().optional().describe('Article title (required for create)'),
      description: z.string().optional().describe('Article description'),
      type: z
        .enum(['product', 'service'])
        .optional()
        .describe('Article type: product or service (required for create)'),
      articleNumber: z.string().optional().describe('Custom article number'),
      gtin: z.string().optional().describe('Global Trade Item Number (EAN/UPC)'),
      note: z.string().optional().describe('Internal note for the article'),
      unitName: z.string().optional().describe('Unit name, e.g. "Stück", "Stunde", "kg"'),
      expectedVersion: z
        .number()
        .optional()
        .describe('Expected current article version; refuse the update if it changed'),
      price: priceSchema
    })
  )
  .output(articleOutputSchema)
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const { action, articleId, ...input } = ctx.input;
    if (action === 'create') {
      const result = await client.createArticle(articlePayload(input));
      return { output: result, message: `Created article **${result.id}**.` };
    }
    const id = required(articleId, 'articleId');
    const current = await client.getArticle(id);
    if (input.expectedVersion !== undefined) {
      integer(input.expectedVersion, 'expectedVersion');
      if (input.expectedVersion !== current.version)
        fail('The article version changed; retrieve it again before updating or deleting.');
    }
    if (action === 'get')
      return {
        output: mapArticle(current),
        message: `Retrieved article **${current.title}** (${current.id}).`
      };
    if (action === 'update') {
      if (
        !Object.entries(input).some(
          ([key, value]) => key !== 'expectedVersion' && value !== undefined
        )
      )
        fail('Provide at least one article field to update.');
      const result = await client.updateArticle(id, articlePayload(input, current));
      return { output: result, message: `Updated article **${result.id}**.` };
    }
    await client.deleteArticle(id);
    try {
      await client.getArticle(id);
    } catch (error) {
      if (apiError(error).data.upstreamStatus === 404)
        return {
          output: { id, deleted: true },
          message: `Deleted article **${id}**; its absence was confirmed.`
        };
      throw error;
    }
    fail('The article is still readable after deletion; its absence is unconfirmed.');
  })
  .build();
