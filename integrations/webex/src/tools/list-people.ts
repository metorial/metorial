import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

let personSchema = z.object({
  personId: z.string().describe('Unique ID of the person'),
  emails: z.array(z.string()).optional().describe('Email addresses'),
  displayName: z.string().optional().describe('Display name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  avatar: z.string().optional().describe('Avatar URL'),
  orgId: z.string().optional().describe('Organization ID'),
  department: z.string().optional().describe('Department'),
  title: z.string().optional().describe('Job title'),
  status: z.string().optional().describe('Presence status (active, inactive, etc.)'),
  type: z.string().optional().describe('Account type (person, bot, appuser)'),
  created: z.string().optional().describe('Account creation timestamp'),
  lastActivity: z.string().optional().describe('Last activity timestamp')
});

export let listPeople = SlateTool.create(spec, {
  name: 'List People',
  key: 'list_people',
  description: `Search and list people in the Webex organization directory. Filter by email, display name, or person ID. Returns profile information including name, email, status, and organization.`,
  instructions: [
    'At least one filter (email, displayName, or personIds) is required by the API.',
    'Use displayName for partial name searches.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by exact email address'),
      displayName: z.string().optional().describe('Filter by display name (partial match)'),
      personIds: z.string().optional().describe('Comma-separated person IDs to look up'),
      orgId: z.string().optional().describe('Filter by organization ID'),
      max: z.number().optional().describe('Maximum number of results (default 100)')
    })
  )
  .output(
    z.object({
      people: z.array(personSchema).describe('List of people')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.listPeople({
      email: ctx.input.email,
      displayName: ctx.input.displayName,
      id: ctx.input.personIds,
      orgId: ctx.input.orgId,
      max: ctx.input.max
    });

    let items = result.items || [];
    let people = items.map((p: any) => ({
      personId: p.id,
      emails: p.emails,
      displayName: p.displayName,
      firstName: p.firstName,
      lastName: p.lastName,
      avatar: p.avatar,
      orgId: p.orgId,
      department: p.department,
      title: p.title,
      status: p.status,
      type: p.type,
      created: p.created,
      lastActivity: p.lastActivity
    }));

    return {
      output: { people },
      message: `Found **${people.length}** person(s).`
    };
  })
  .build();

export let getPersonDetails = SlateTool.create(spec, {
  name: 'Get Person Details',
  key: 'get_person',
  description: `Retrieve full profile details of a specific person by their person ID, or get the authenticated user's own profile by omitting the person ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z
        .string()
        .optional()
        .describe('Person ID to look up (omit to get your own profile)')
    })
  )
  .output(personSchema)
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = ctx.input.personId
      ? await client.getPerson(ctx.input.personId)
      : await client.getMe();

    return {
      output: {
        personId: result.id,
        emails: result.emails,
        displayName: result.displayName,
        firstName: result.firstName,
        lastName: result.lastName,
        avatar: result.avatar,
        orgId: result.orgId,
        department: result.department,
        title: result.title,
        status: result.status,
        type: result.type,
        created: result.created,
        lastActivity: result.lastActivity
      },
      message: `Person: **${result.displayName}** (${result.emails?.[0] || 'no email'}).`
    };
  })
  .build();
