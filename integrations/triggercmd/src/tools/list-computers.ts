import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listComputers = SlateTool.create(spec, {
  name: 'List Computers',
  key: 'list_computers',
  description: `Retrieve all computers registered to your TRIGGERcmd account. Returns each computer's ID and name, which can be used to trigger commands or list commands for a specific computer.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      computers: z
        .array(
          z.object({
            computerId: z.string().describe('Unique identifier of the computer'),
            name: z.string().describe('Name of the computer'),
            createdAt: z.string().optional().describe('When the computer was registered'),
            updatedAt: z.string().optional().describe('When the computer was last updated')
          })
        )
        .describe('List of registered computers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let computers = await client.listComputers();

    let mapped = computers.map(c => ({
      computerId: c._id,
      name: c.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: {
        computers: mapped
      },
      message: `Found **${mapped.length}** registered computer(s): ${mapped.map(c => `**${c.name}**`).join(', ')}.`
    };
  })
  .build();
