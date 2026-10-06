import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { ednString, fail, record, text } from '../lib/validation';
import { spec } from '../spec';
export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description:
    'Retrieve an exact page by title with its native nested block tree. Optionally download this page as locally generated JSON; this is not a full graph export.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      title: z.string().describe('Exact page title'),
      downloadJson: z
        .boolean()
        .default(false)
        .describe('Prepare the exact returned page as a JSON download, within an 8 MiB limit')
    })
  )
  .output(
    z.object({
      pageUid: z.string().nullable().describe('Exact page UID, or null if not found'),
      title: z.string().describe('Requested page title'),
      children: z.unknown().describe('Native nested block tree'),
      fileName: z.string().optional().describe('Prepared JSON file name')
    })
  )
  .handleInvocation(async ctx => {
    const title = text(ctx.input.title, 'Page title');
    const client = new RoamClient({ graphName: ctx.config.graphName, token: ctx.auth.token });
    const entity = await client.pull(
      '[:block/uid :node/title {:block/children [:block/uid :block/string :block/order :block/heading :block/text-align {:block/children ...}]}]',
      `[:node/title ${ednString(title)}]`
    );
    if (
      entity !== null &&
      (!record(entity) ||
        typeof entity[':block/uid'] !== 'string' ||
        entity[':node/title'] !== title)
    )
      fail('The response did not identify the exact requested page title.');
    const page = record(entity) ? entity : null;
    let fileName: string | undefined;
    if (ctx.input.downloadJson) {
      if (!page)
        fail(
          'The exact page does not exist. Retrieve a valid page before requesting its JSON download.'
        );
      const bytes = Buffer.from(JSON.stringify(page, null, 2));
      if (bytes.byteLength > 8 * 1024 * 1024)
        fail(
          'This page exceeds the 8 MiB JSON download limit. Retrieve a smaller subtree with pull_data.'
        );
      fileName = 'roam-page.json';
      await ctx.addAttachment({
        type: 'content',
        content: new Response(bytes, { headers: { 'content-type': 'application/json' } }),
        filename: fileName
      });
    }
    return {
      output: {
        pageUid: page ? String(page[':block/uid']) : null,
        title,
        children: page?.[':block/children'] ?? [],
        fileName
      },
      message: page
        ? 'Read the exact page and native block tree.'
        : 'The exact page was not found.'
    };
  })
  .build();
