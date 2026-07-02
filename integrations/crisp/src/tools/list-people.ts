import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `List and search contact profiles in the Crisp CRM. Supports searching by name, email, or segment. Returns paginated contact profiles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)'),
      searchQuery: z.string().optional().describe('Search by name, email, or segment value'),
      searchType: z
        .enum(['text', 'segment'])
        .optional()
        .describe('Type of search: text for free text, segment for segment-based')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(
          z.object({
            peopleId: z.string().describe('People profile ID'),
            email: z.string().optional().describe('Contact email'),
            nickname: z.string().optional().describe('Contact nickname'),
            avatar: z.string().optional().describe('Contact avatar URL'),
            phone: z.string().optional().describe('Contact phone number'),
            address: z.string().optional().describe('Contact address'),
            segments: z.array(z.string()).optional().describe('Contact segments/tags'),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .describe('List of contact profiles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, websiteId: ctx.config.websiteId });

    let results = await client.listPeopleProfiles({
      pageNumber: ctx.input.pageNumber,
      searchQuery: ctx.input.searchQuery,
      searchType: ctx.input.searchType
    });

    let profiles = (results || []).map((p: any) => ({
      peopleId: p.people_id,
      email: p.email,
      nickname: p.person?.nickname,
      avatar: p.person?.avatar,
      phone: p.phone,
      address: p.address,
      segments: p.segments,
      createdAt: p.created_at ? String(p.created_at) : undefined,
      updatedAt: p.updated_at ? String(p.updated_at) : undefined
    }));

    return {
      output: { profiles },
      message: `Found **${profiles.length}** contacts${ctx.input.searchQuery ? ` matching "${ctx.input.searchQuery}"` : ''} on page ${ctx.input.pageNumber ?? 1}.`
    };
  })
  .build();
