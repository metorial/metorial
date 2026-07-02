import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `Retrieve people (users) from Teamwork. Can list all people on the site or filter by project membership. Supports search by name.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Filter by project ID to list project members'),
      searchTerm: z.string().optional().describe('Search by name'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      people: z
        .array(
          z.object({
            personId: z.string().describe('Person ID'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            email: z.string().optional().describe('Email address'),
            companyId: z.string().optional().describe('Company ID'),
            companyName: z.string().optional().describe('Company name'),
            avatarUrl: z.string().optional().describe('Avatar URL'),
            isAdmin: z.boolean().optional().describe('Whether the person is an admin')
          })
        )
        .describe('List of people')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listPeople({
      projectId: ctx.input.projectId,
      searchTerm: ctx.input.searchTerm,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let people = (result.people || []).map((p: any) => ({
      personId: String(p.id),
      firstName: p['first-name'] || p.firstName || undefined,
      lastName: p['last-name'] || p.lastName || undefined,
      email: p['email-address'] || p.emailAddress || undefined,
      companyId: p['company-id']
        ? String(p['company-id'])
        : p.companyId
          ? String(p.companyId)
          : undefined,
      companyName: p['company-name'] || p.companyName || undefined,
      avatarUrl: p['avatar-url'] || p.avatarUrl || undefined,
      isAdmin: p.administrator ?? p.administrator ?? undefined
    }));

    return {
      output: { people },
      message: `Found **${people.length}** person(s).`
    };
  })
  .build();
