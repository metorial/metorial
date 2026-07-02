import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomCode = SlateTool.create(spec, {
  name: 'List Custom Code',
  key: 'list_custom_code',
  description: `List custom code scripts configured at the site or page level. This is read-only inspection coverage; it does not create, update, or delete custom code.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z
        .enum(['site', 'page'])
        .describe('Whether to list site-level or page-level custom code'),
      siteId: z.string().optional().describe('Site ID required when target is site'),
      pageId: z.string().optional().describe('Page ID required when target is page')
    })
  )
  .output(
    z.object({
      target: z.enum(['site', 'page']).describe('Custom code target that was inspected'),
      scripts: z.array(z.any()).describe('Custom code scripts returned by Webflow')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);

    if (ctx.input.target === 'site') {
      if (!ctx.input.siteId) {
        throw createApiServiceError('siteId is required when target is site.');
      }
      let data = await client.listSiteCustomCode(ctx.input.siteId);
      let scripts = data.scripts ?? data.customCode ?? [];
      return {
        output: { target: 'site', scripts },
        message: `Found **${scripts.length}** site custom code script(s).`
      };
    }

    if (!ctx.input.pageId) {
      throw createApiServiceError('pageId is required when target is page.');
    }
    let data = await client.listPageCustomCode(ctx.input.pageId);
    let scripts = data.scripts ?? data.customCode ?? [];
    return {
      output: { target: 'page', scripts },
      message: `Found **${scripts.length}** page custom code script(s).`
    };
  })
  .build();
