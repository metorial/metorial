import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { spec } from '../spec';

let personSchema = z.object({
  wikidataId: z.string().describe('Wikidata entity ID (e.g. Q312556)'),
  name: z.string().describe('Full name'),
  description: z.string().describe('Short biographical description'),
  aliases: z.array(z.string()).describe('Alternative names'),
  occupations: z.array(z.string()).describe('Occupations'),
  positions: z
    .array(
      z.object({
        role: z.string().describe('Position title'),
        employer: z.string().optional().describe('Employer or organization'),
        startTime: z.string().optional().describe('Start date'),
        endTime: z.string().optional().describe('End date')
      })
    )
    .describe('Positions held')
});

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People',
  key: 'search_people',
  description: `Search Perigon's database of 650,000+ public figures, politicians, celebrities, and newsworthy individuals. Returns biographical information including occupations, positions held, and aliases. Use quoted names for exact matching (e.g. \`"Jeff Bezos"\`).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().describe('Person name to search (use quotes for exact match)'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      numResults: z.number().describe('Total number of matching people'),
      people: z.array(personSchema).describe('List of matching people')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchPeople({
      name: ctx.input.name,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let people = (result.results || []).map(p => ({
      wikidataId: p.wikidataId || '',
      name: p.name || '',
      description: p.description || '',
      aliases: p.aliases || [],
      occupations: (p.occupation || []).map(o => o.label),
      positions: (p.position || []).map(pos => ({
        role: pos.label || '',
        employer: pos.employer?.label,
        startTime: pos.startTime || undefined,
        endTime: pos.endTime || undefined
      }))
    }));

    return {
      output: {
        numResults: result.numResults || 0,
        people
      },
      message: `Found **${result.numResults || 0}** people matching "${ctx.input.name}" (showing ${people.length}).`
    };
  })
  .build();
