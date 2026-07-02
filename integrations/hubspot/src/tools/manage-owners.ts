import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let ownerOutputSchema = z.object({
  ownerId: z.string().describe('HubSpot owner ID'),
  email: z.string().optional().describe('Owner email address'),
  firstName: z.string().optional().describe('Owner first name'),
  lastName: z.string().optional().describe('Owner last name'),
  userId: z.number().optional().describe('Associated user ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp'),
  archived: z.boolean().optional().describe('Whether the owner is archived'),
  teams: z
    .array(
      z.object({
        teamId: z.string().optional().describe('Team ID'),
        name: z.string().optional().describe('Team name'),
        primary: z.boolean().optional().describe('Whether this is the primary team')
      })
    )
    .optional()
    .describe('Teams the owner belongs to')
});

export let listOwners = SlateTool.create(spec, {
  name: 'List Owners',
  key: 'list_owners',
  description: `List CRM owners (users who can be assigned to records) in HubSpot. Useful for finding owner IDs to assign to contacts, companies, deals, or tickets.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.listOwners)
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of owners to return (max 500)'),
      after: z.string().optional().describe('Pagination cursor'),
      email: z.string().optional().describe('Filter by email address')
    })
  )
  .output(
    z.object({
      owners: z.array(ownerOutputSchema).describe('List of CRM owners'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.listOwners(
      ctx.input.limit || 100,
      ctx.input.after,
      ctx.input.email
    );

    let owners = (result.results || []).map((o: any) => ({
      ownerId: o.id,
      email: o.email,
      firstName: o.firstName,
      lastName: o.lastName,
      userId: o.userId,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      archived: o.archived,
      teams: o.teams?.map((t: any) => ({
        teamId: String(t.id),
        name: t.name,
        primary: t.primary
      }))
    }));

    return {
      output: {
        owners,
        hasMore: !!result.paging?.next?.after,
        nextCursor: result.paging?.next?.after
      },
      message: `Retrieved **${owners.length}** owners`
    };
  })
  .build();

export let getOwner = SlateTool.create(spec, {
  name: 'Get Owner',
  key: 'get_owner',
  description: `Retrieve a specific CRM owner by ID from HubSpot.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getOwner)
  .input(
    z.object({
      ownerId: z.string().describe('HubSpot owner ID')
    })
  )
  .output(ownerOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getOwner(ctx.input.ownerId);

    return {
      output: {
        ownerId: result.id,
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        userId: result.userId,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived,
        teams: result.teams?.map((t: any) => ({
          teamId: String(t.id),
          name: t.name,
          primary: t.primary
        }))
      },
      message: `Retrieved owner **${result.firstName || ''} ${result.lastName || ''}** (${result.email || 'no email'})`
    };
  })
  .build();
