import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let pullData = SlateTool.create(spec, {
  name: 'Pull Entity Data',
  key: 'pull_data',
  description: `Retrieve structured data for a specific entity (page or block) from the Roam graph by its identifier. Returns selected or all attributes of the entity using Datomic pull syntax.

Use this to get detailed information about a known page or block, including its content, children, references, and metadata.`,
  instructions: [
    'The selector defines which attributes to pull. Use "[*]" to pull all attributes.',
    'The entityId can be a page title like [:node/title "Page Name"] or a block UID like [:block/uid "abc123"].',
    'Common selectors: [:block/string :block/uid :block/children :block/order :node/title].'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      selector: z
        .string()
        .describe(
          'Pull pattern/selector, e.g. "[*]" for all attributes, or "[:block/string :block/uid :block/children]"'
        ),
      entityId: z
        .string()
        .describe('Entity identifier, e.g. [:node/title "Page Name"] or [:block/uid "abc123"]')
    })
  )
  .output(
    z.object({
      entity: z.unknown().describe('The pulled entity data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let entity = await client.pull(ctx.input.selector, ctx.input.entityId);

    return {
      output: { entity },
      message: `Pulled entity data from graph **${ctx.config.graphName}**.`
    };
  })
  .build();
