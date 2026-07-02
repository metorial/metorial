import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRun = SlateTool.create(spec, {
  name: 'Delete Run',
  key: 'delete_run',
  description: `Delete a scraping run and all its extracted data. If the run is still in progress, it will be cancelled first. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      runToken: z.string().describe('Unique token identifying the run to delete')
    })
  )
  .output(
    z.object({
      runToken: z.string().describe('Token of the deleted run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteRun(ctx.input.runToken);

    return {
      output: {
        runToken: result.run_token
      },
      message: `Run **${result.run_token}** has been deleted along with its data.`
    };
  })
  .build();
