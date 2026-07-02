import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageArticle = SlateTool.create(spec, {
  name: 'Manage Article',
  key: 'manage_article',
  description: `Create, update, or retrieve a knowledge base article. Specify an articleId to update or retrieve an existing article, or provide a categoryId to create a new one. Articles support HTML content, status management, and SEO metadata.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      articleId: z.string().optional().describe('Existing article ID to update or retrieve'),
      categoryId: z
        .string()
        .optional()
        .describe('KB category ID (required when creating a new article)'),
      title: z.string().optional().describe('Article title'),
      answer: z.string().optional().describe('Article content/body (HTML supported)'),
      status: z.enum(['Draft', 'Published']).optional().describe('Article status'),
      permalink: z.string().optional().describe('SEO-friendly URL slug'),
      seoDescription: z.string().optional().describe('SEO meta description'),
      tags: z.array(z.string()).optional().describe('Tags for the article')
    })
  )
  .output(
    z.object({
      articleId: z.string().describe('ID of the article'),
      title: z.string().optional().describe('Article title'),
      status: z.string().optional().describe('Article status'),
      categoryId: z.string().optional().describe('Category ID'),
      permalink: z.string().optional().describe('Permalink'),
      createdTime: z.string().optional().describe('Creation time'),
      modifiedTime: z.string().optional().describe('Last modification time')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { articleId, categoryId, ...fields } = ctx.input;

    let articleData: Record<string, any> = {};
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) articleData[key] = value;
    }

    let result: any;
    let action: string;

    if (articleId && Object.keys(articleData).length > 0) {
      result = await client.updateArticle(articleId, articleData);
      action = 'Updated';
    } else if (articleId) {
      result = await client.getArticle(articleId);
      action = 'Retrieved';
    } else if (categoryId) {
      result = await client.createArticle(categoryId, articleData);
      action = 'Created';
    } else {
      throw new Error(
        'Either articleId (to update/retrieve) or categoryId (to create) must be provided'
      );
    }

    return {
      output: {
        articleId: result.id,
        title: result.title,
        status: result.status,
        categoryId: result.categoryId,
        permalink: result.permalink,
        createdTime: result.createdTime,
        modifiedTime: result.modifiedTime
      },
      message: `${action} article **${result.title || result.id}**`
    };
  })
  .build();
