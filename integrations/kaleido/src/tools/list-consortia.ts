import { SlateTool } from 'slates';
import { z } from 'zod';
import { KaleidoClient } from '../lib/client';
import { spec } from '../spec';

export let listConsortia = SlateTool.create(spec, {
  name: 'List Consortia',
  key: 'list_consortia',
  description: `List all consortia in your Kaleido organization. A consortium represents a business network that groups memberships, environments, and blockchain resources.
Use this to discover available consortia, their current state, and associated metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      consortia: z
        .array(
          z.object({
            consortiumId: z.string().describe('Unique consortium identifier'),
            name: z.string().describe('Consortium name'),
            description: z.string().optional().describe('Consortium description'),
            mode: z
              .string()
              .optional()
              .describe('Consortium mode (single-org or decentralized)'),
            state: z.string().optional().describe('Current state of the consortium'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            owner: z.string().optional().describe('Owning organization ID')
          })
        )
        .describe('List of consortia'),
      count: z.number().describe('Number of consortia')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KaleidoClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let consortia = await client.listConsortia();

    let mapped = consortia.map((c: any) => ({
      consortiumId: c._id,
      name: c.name,
      description: c.description || undefined,
      mode: c.mode || undefined,
      state: c.state || undefined,
      createdAt: c.created_at || undefined,
      owner: c.owner || undefined
    }));

    return {
      output: {
        consortia: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** consortium/consortia.${mapped.length > 0 ? ` ${mapped.map(c => `**${c.name}** (${c.state || 'unknown'})`).join(', ')}` : ''}`
    };
  })
  .build();
