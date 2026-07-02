import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let linkSchema = z.object({
  linkId: z.string().describe('Unique link identifier'),
  name: z.string().describe('Public link name'),
  privateName: z
    .string()
    .nullable()
    .optional()
    .describe('Private name visible only to the owner'),
  slug: z.string().describe('URL slug'),
  description: z.string().nullable().optional().describe('Link description'),
  state: z.string().describe('Link state (active, pending, disabled)'),
  defaultDuration: z.number().describe('Default duration in minutes'),
  durations: z.array(z.number()).describe('Available durations in minutes'),
  increment: z.number().describe('Time slot increment in minutes'),
  fields: z
    .array(
      z.object({
        fieldId: z.string(),
        label: z.string(),
        type: z.string(),
        isRequired: z.boolean()
      })
    )
    .optional()
    .describe('Custom fields configured on the link'),
  scopeId: z.string().nullable().optional().describe('Associated scope/team ID'),
  scopeName: z.string().nullable().optional().describe('Associated scope/team name')
});

export let listLinksTool = SlateTool.create(spec, {
  name: 'List Scheduling Links',
  key: 'list_links',
  description: `List all scheduling links in the SavvyCal account. Returns link configuration including name, slug, durations, custom fields, and state. Supports cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of links to return (1-100, default 20)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      links: z.array(linkSchema),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      previousCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listLinks({
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let links = result.entries.map((l: any) => ({
      linkId: l.id,
      name: l.name,
      privateName: l.private_name,
      slug: l.slug,
      description: l.description,
      state: l.state,
      defaultDuration: l.default_duration,
      durations: l.durations,
      increment: l.increment,
      fields: l.fields?.map((f: any) => ({
        fieldId: f.id,
        label: f.label,
        type: f.type,
        isRequired: f.is_required
      })),
      scopeId: l.scope?.id,
      scopeName: l.scope?.name
    }));

    return {
      output: {
        links,
        nextCursor: result.metadata.after,
        previousCursor: result.metadata.before
      },
      message: `Found **${links.length}** scheduling link(s).${result.metadata.after ? ' More available via pagination.' : ''}`
    };
  })
  .build();
