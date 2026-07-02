import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebForms = SlateTool.create(spec, {
  name: 'List Web Forms',
  key: 'list_web_forms',
  description: `List web forms (widgets) in the account. Returns embeddable signing forms with their status and URLs.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of web forms per page')
    })
  )
  .output(
    z.object({
      webForms: z
        .array(
          z.object({
            webFormId: z.string().describe('ID of the web form'),
            name: z.string().describe('Name of the web form'),
            status: z.string().optional().describe('Current status'),
            url: z.string().optional().describe('Public URL for the web form'),
            modifiedDate: z.string().optional().describe('Last modification date')
          })
        )
        .describe('List of web forms'),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.listWebForms({
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    let webForms = (result.userWidgetList || []).map((w: any) => ({
      webFormId: w.id,
      name: w.name,
      status: w.status,
      url: w.url,
      modifiedDate: w.modifiedDate
    }));

    return {
      output: {
        webForms,
        cursor: result.page?.nextCursor
      },
      message: `Found **${webForms.length}** web form(s).`
    };
  });
