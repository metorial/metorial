import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let relationshipSchema = z
  .object({
    domain: z.string().optional().describe('Related domain name'),
    type: z.string().optional().describe('Type of relationship'),
    firstDetected: z.string().optional().describe('When the relationship was first detected'),
    lastDetected: z.string().optional().describe('When the relationship was last detected')
  })
  .passthrough();

export let findRelationships = SlateTool.create(spec, {
  name: 'Find Website Relationships',
  key: 'find_relationships',
  description: `Discover relationships between websites — which sites are linked together, by what mechanism, and for how long. Useful for identifying related domains, shared ownership, advertising networks, and cross-site analytics connections.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain to find relationships for (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      relationships: z
        .array(relationshipSchema)
        .describe('Related websites and their connection details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.relationships(ctx.input.domain);

    let relationships = data?.Results ?? [];

    return {
      output: {
        relationships
      },
      message: `Found **${relationships.length}** related sites for **${ctx.input.domain}**.`
    };
  });
