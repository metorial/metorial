import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let priceSchema = z
  .object({
    netPrice: z.number().optional().describe('Net price of the article'),
    grossPrice: z.number().optional().describe('Gross price of the article'),
    taxRatePercentage: z
      .enum(['0', '7', '19'])
      .transform(Number)
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
    'Use action "create" to add a new article — title and type are required.',
    'Use action "get" to retrieve full details of an article by its ID.',
    'Use action "update" to modify an existing article — articleId is required.',
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
      price: priceSchema
    })
  )
  .output(articleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.title) throw new Error('title is required for article creation');
      if (!ctx.input.type) throw new Error('type is required for article creation');

      let articleData: Record<string, any> = {
        title: ctx.input.title,
        type: ctx.input.type
      };
      if (ctx.input.description) articleData.description = ctx.input.description;
      if (ctx.input.articleNumber) articleData.articleNumber = ctx.input.articleNumber;
      if (ctx.input.gtin) articleData.gtin = ctx.input.gtin;
      if (ctx.input.note) articleData.note = ctx.input.note;
      if (ctx.input.unitName) articleData.unitName = ctx.input.unitName;
      if (ctx.input.price) {
        articleData.price = {};
        if (ctx.input.price.netPrice !== undefined)
          articleData.price.netPrice = ctx.input.price.netPrice;
        if (ctx.input.price.grossPrice !== undefined)
          articleData.price.grossPrice = ctx.input.price.grossPrice;
        if (ctx.input.price.taxRatePercentage !== undefined)
          articleData.price.taxRatePercentage = ctx.input.price.taxRatePercentage;
        if (ctx.input.price.leadingPrice)
          articleData.price.leadingPrice = ctx.input.price.leadingPrice;
      }

      let result = await client.createArticle(articleData);

      return {
        output: {
          id: result.id,
          resourceUri: result.resourceUri,
          title: ctx.input.title,
          type: ctx.input.type,
          version: result.version,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Created article **${ctx.input.title}** (${result.id}).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.articleId) throw new Error('articleId is required for get action');

      let article = await client.getArticle(ctx.input.articleId);

      return {
        output: {
          id: article.id,
          resourceUri: article.resourceUri,
          title: article.title,
          description: article.description,
          type: article.type,
          articleNumber: article.articleNumber,
          gtin: article.gtin,
          note: article.note,
          unitName: article.unitName,
          price: article.price
            ? {
                netPrice: article.price.netPrice,
                grossPrice: article.price.grossPrice,
                taxRatePercentage: article.price.taxRatePercentage,
                leadingPrice: article.price.leadingPrice
              }
            : undefined,
          version: article.version,
          createdDate: article.createdDate,
          updatedDate: article.updatedDate
        },
        message: `Retrieved article **${article.title}** (${article.id}) — ${article.type}, article number: ${article.articleNumber || 'N/A'}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.articleId) throw new Error('articleId is required for update action');

      let articleData: Record<string, any> = {};
      if (ctx.input.title) articleData.title = ctx.input.title;
      if (ctx.input.description) articleData.description = ctx.input.description;
      if (ctx.input.type) articleData.type = ctx.input.type;
      if (ctx.input.articleNumber) articleData.articleNumber = ctx.input.articleNumber;
      if (ctx.input.gtin) articleData.gtin = ctx.input.gtin;
      if (ctx.input.note) articleData.note = ctx.input.note;
      if (ctx.input.unitName) articleData.unitName = ctx.input.unitName;
      if (ctx.input.price) {
        articleData.price = {};
        if (ctx.input.price.netPrice !== undefined)
          articleData.price.netPrice = ctx.input.price.netPrice;
        if (ctx.input.price.grossPrice !== undefined)
          articleData.price.grossPrice = ctx.input.price.grossPrice;
        if (ctx.input.price.taxRatePercentage !== undefined)
          articleData.price.taxRatePercentage = ctx.input.price.taxRatePercentage;
        if (ctx.input.price.leadingPrice)
          articleData.price.leadingPrice = ctx.input.price.leadingPrice;
      }

      let result = await client.updateArticle(ctx.input.articleId, articleData);

      return {
        output: {
          id: result.id,
          resourceUri: result.resourceUri,
          title: ctx.input.title,
          version: result.version,
          createdDate: result.createdDate,
          updatedDate: result.updatedDate
        },
        message: `Updated article **${ctx.input.title || result.id}**.`
      };
    }

    // delete
    if (!ctx.input.articleId) throw new Error('articleId is required for delete action');

    await client.deleteArticle(ctx.input.articleId);

    return {
      output: {
        id: ctx.input.articleId,
        deleted: true
      },
      message: `Deleted article **${ctx.input.articleId}**.`
    };
  })
  .build();
