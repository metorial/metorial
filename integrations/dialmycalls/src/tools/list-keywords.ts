import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listKeywords = SlateTool.create(spec, {
  name: 'List Keywords',
  key: 'list_keywords',
  description: `Retrieve SMS keywords from your DialMyCalls account. Keywords are required for text broadcasting and allow contacts to opt in/out by texting START/STOP to your vanity number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywordId: z
        .string()
        .optional()
        .describe('Fetch a specific keyword by ID. If omitted, lists all keywords.'),
      range: z.string().optional().describe('Pagination range, e.g. "records=201-300"')
    })
  )
  .output(
    z.object({
      keywords: z.array(
        z.object({
          keywordId: z.string().optional(),
          keyword: z.string().optional(),
          status: z
            .string()
            .optional()
            .describe('Status: active, pendingdelete, onhold, billingdecline'),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.keywordId) {
      let kw = await client.getKeyword(ctx.input.keywordId);
      return {
        output: {
          keywords: [
            {
              keywordId: kw.id,
              keyword: kw.keyword,
              status: kw.status,
              createdAt: kw.created_at,
              updatedAt: kw.updated_at
            }
          ]
        },
        message: `Retrieved keyword **${kw.keyword}**.`
      };
    }

    let rawKeywords = await client.listKeywords(ctx.input.range);
    let keywords = rawKeywords.map(k => ({
      keywordId: k.id,
      keyword: k.keyword,
      status: k.status,
      createdAt: k.created_at,
      updatedAt: k.updated_at
    }));

    return {
      output: { keywords },
      message: `Retrieved **${keywords.length}** keyword(s).`
    };
  })
  .build();
