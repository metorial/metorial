import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve a page and its content from the Roam Research graph by title. Returns the page UID and its full block tree including nested children.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      title: z.string().describe('Title of the page to retrieve')
    })
  )
  .output(
    z.object({
      pageUid: z.string().nullable().describe('UID of the page, or null if not found'),
      title: z.string().describe('Title of the page'),
      children: z.unknown().describe('Nested block tree of the page content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let entity = await client.pull(
      '[:block/uid :node/title {:block/children [:block/uid :block/string :block/order :block/heading :block/text-align {:block/children ...}]}]',
      `[:node/title "${ctx.input.title}"]`
    );

    let page = entity as Record<string, unknown> | null;
    let pageUid = page ? String(page[':block/uid'] ?? '') : null;
    let children = page ? (page[':block/children'] ?? []) : [];

    return {
      output: {
        pageUid,
        title: ctx.input.title,
        children
      },
      message: pageUid
        ? `Retrieved page **"${ctx.input.title}"** (UID: ${pageUid}) from graph **${ctx.config.graphName}**.`
        : `Page **"${ctx.input.title}"** not found in graph **${ctx.config.graphName}**.`
    };
  })
  .build();
