import { SlateTool } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { spec } from '../spec';

let relationshipSchema = z.object({
  relationshipId: z.string().describe('Unique ID of the relationship'),
  name: z.string().describe('Name of the person'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  company: z.string().optional().describe('Company or organization'),
  title: z.string().optional().describe('Job title or role'),
  createdAt: z.string().optional().describe('Timestamp when the relationship was created'),
  updatedAt: z.string().optional().describe('Timestamp when the relationship was last updated')
});

export let searchRelationships = SlateTool.create(spec, {
  name: 'Search Relationships',
  key: 'search_relationships',
  description: `Search for existing relationships in Parma CRM. Use this to find contacts by name, email, company, or other details. Returns a list of matching relationships. If no query is provided, returns all relationships.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query to filter relationships by name, email, company, etc.'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      relationships: z.array(relationshipSchema).describe('List of matching relationships'),
      totalCount: z.number().optional().describe('Total number of matching relationships')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ParmaClient(ctx.auth.token);

    let result = ctx.input.query
      ? await client.searchRelationships(ctx.input.query, {
          page: ctx.input.page,
          perPage: ctx.input.perPage
        })
      : await client.listRelationships({
          page: ctx.input.page,
          perPage: ctx.input.perPage
        });

    let items = Array.isArray(result) ? result : (result.data ?? result.relationships ?? []);
    let totalCount = Array.isArray(result)
      ? items.length
      : (result.total ?? result.total_count ?? items.length);

    let relationships = items.map((r: any) => ({
      relationshipId: String(r.id),
      name: r.name,
      email: r.email ?? undefined,
      phone: r.phone ?? undefined,
      company: r.company ?? undefined,
      title: r.title ?? undefined,
      createdAt: r.created_at ?? undefined,
      updatedAt: r.updated_at ?? undefined
    }));

    return {
      output: {
        relationships,
        totalCount
      },
      message: ctx.input.query
        ? `Found **${relationships.length}** relationship(s) matching "${ctx.input.query}".`
        : `Retrieved **${relationships.length}** relationship(s).`
    };
  })
  .build();
