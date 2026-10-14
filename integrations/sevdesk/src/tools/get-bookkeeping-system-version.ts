import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getBookkeepingSystemVersion = SlateTool.create(spec, {
  name: 'Get Bookkeeping System Version',
  key: 'get_bookkeeping_system_version',
  description:
    'Identify whether the connected account uses bookkeeping version 1.0 or 2.0. Version 2.0 uses tax rules and DATEV booking accounts instead of legacy tax types and accounting types.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      version: z.string().describe('Bookkeeping system version returned by sevDesk.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });
    let version = await client.getBookkeepingSystemVersion();
    return {
      output: { version },
      message: `The connected account uses bookkeeping version **${version}**.`
    };
  })
  .build();
