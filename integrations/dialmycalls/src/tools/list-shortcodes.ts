import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listShortcodes = SlateTool.create(spec, {
  name: 'List Shortcodes',
  key: 'list_shortcodes',
  description:
    'Retrieve SMS shortcodes available on your account. Use the returned shortcode IDs with create_text_broadcast.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      range: z
        .string()
        .optional()
        .describe('Pagination range, e.g. records=1-100. Request at most 100 records.')
    })
  )
  .output(
    z.object({
      shortcodes: z.array(
        z.object({
          shortcodeId: z.string().optional(),
          shortcode: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let records = await client.listShortcodes(ctx.input.range);
    let shortcodes = records.map(record => ({
      shortcodeId: record.id,
      shortcode: record.shortcode,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    }));
    return {
      output: { shortcodes },
      message: `Retrieved **${shortcodes.length}** shortcode(s).`
    };
  })
  .build();
