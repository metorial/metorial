import { SlateTool } from 'slates';
import { z } from 'zod';
import { PerigonClient } from '../lib/client';
import { formatPerson } from '../lib/responses';
import { spec } from '../spec';

let personSchema = z
  .object({
    wikidataId: z.string().describe('Wikidata entity ID (e.g. Q312556)'),
    name: z.string().describe('Full name'),
    description: z.string().describe('Short biographical description'),
    aliases: z.array(z.string()).describe('Alternative names'),
    occupations: z.array(z.string()).describe('Occupations'),
    positions: z
      .array(
        z
          .object({
            role: z.string().describe('Position title'),
            employer: z.string().optional().describe('Employer or organization'),
            startTime: z.string().optional().describe('Start date'),
            endTime: z.string().optional().describe('End date')
          })
          .partial()
      )
      .describe('Positions held')
  })
  .partial();

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
      wikidataId: z.string().optional().describe('Filter by a Wikidata entity identifier'),
      occupationLabel: z
        .string()
        .optional()
        .describe('Filter by occupation name, such as politician or actor'),
      name: z.string().describe('Person name to search (use quotes for exact match)'),
      page: z.number().optional().describe('Page number (zero-based)'),
      size: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response, including unavailable enrichment values'),
      numResults: z.number().describe('Total number of matching people'),
      people: z.array(personSchema).describe('List of matching people')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PerigonClient(ctx.auth.token);

    let result = await client.searchPeople({
      wikidataId: ctx.input.wikidataId,
      occupationLabel: ctx.input.occupationLabel,
      name: ctx.input.name,
      page: ctx.input.page,
      size: ctx.input.size
    });

    let people = result.results.map(formatPerson);

    return {
      output: {
        raw: result,
        numResults: result.numResults,
        people
      },
      message: `Found **${result.numResults}** people matching "${ctx.input.name}" (showing ${people.length}).`
    };
  })
  .build();
