import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let listPlaybooks = SlateTool.create(spec, {
  name: 'List Playbooks',
  key: 'list_playbooks',
  description: `List active playbooks in Drift. Playbooks are automated message workflows and campaigns that proactively engage site visitors. This is read-only — playbooks can only be edited in the Drift UI.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      playbooks: z.array(
        z.object({
          playbookId: z.any().optional().describe('Playbook identifier'),
          name: z.string().optional().describe('Playbook name'),
          status: z.string().optional().describe('Playbook status'),
          type: z.string().optional().describe('Playbook type')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);

    let playbooks = await client.listPlaybooks();

    return {
      output: {
        playbooks: playbooks.map((p: any) => ({
          playbookId: p.id,
          name: p.name,
          status: p.status,
          type: p.type
        }))
      },
      message: `Retrieved **${playbooks.length}** playbook(s).`
    };
  })
  .build();
