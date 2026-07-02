import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let strengthSchema = z.object({
  internalId: z.number().describe('ID of the internal team member'),
  externalId: z.number().describe('ID of the external contact'),
  strength: z.number().describe('Relationship strength score')
});

export let getRelationshipStrengths = SlateTool.create(spec, {
  name: 'Get Relationship Strengths',
  key: 'get_relationship_strengths',
  description: `Query relationship strength scores between internal team members and external contacts. Scores are computed from email, call, and meeting activity and are recalculated daily. Useful for identifying who on your team has the strongest connection to a given contact.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      externalId: z
        .number()
        .describe('Person ID of the external contact to query strengths for'),
      internalId: z
        .number()
        .optional()
        .describe(
          'Person ID of a specific internal team member (omit to get all team member strengths)'
        )
    })
  )
  .output(
    z.object({
      strengths: z.array(strengthSchema).describe('List of relationship strength scores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.getRelationshipStrengths({
      externalId: ctx.input.externalId,
      internalId: ctx.input.internalId
    });

    let strengths = (Array.isArray(result) ? result : []).map((s: any) => ({
      internalId: s.internal_id,
      externalId: s.external_id,
      strength: s.strength
    }));

    return {
      output: { strengths },
      message: `Retrieved **${strengths.length}** relationship strength score(s) for external contact ${ctx.input.externalId}.`
    };
  })
  .build();
