import { SlateTool } from 'slates';
import { z } from 'zod';
import { extractRecords } from '../lib/client';
import { finagoServiceError } from '../lib/errors';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let licenseIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export let finagoGetProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'finago_get_profile',
  description:
    'Read the connected Finago profile and organization information, with optional identifiers, licenses, license organization, and organization people.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      thumb: z
        .boolean()
        .optional()
        .describe('Include a thumbnail image in the /me profile response.'),
      bigthumb: z
        .boolean()
        .optional()
        .describe('Include a larger thumbnail image in the /me profile response.'),
      maxAge: z
        .number()
        .int()
        .optional()
        .describe('Maximum age of cached /me profile data in seconds.'),
      includeIdentifiers: z
        .boolean()
        .optional()
        .describe('Also read /me/identifiers for the connected profile.'),
      identifierType: z
        .string()
        .optional()
        .describe('Identifier type filter for /me/identifiers. Implies includeIdentifiers.'),
      identifierStatus: z
        .enum(['Unconfirmed', 'Confirmed'])
        .optional()
        .describe('Identifier status filter for /me/identifiers. Implies includeIdentifiers.'),
      includeLicenses: z.boolean().optional().describe('Also read /me/licenses.'),
      licenseOrganizationId: z
        .number()
        .int()
        .optional()
        .describe('Organization ID filter for /me/licenses. Implies includeLicenses.'),
      licensePersonId: z
        .number()
        .int()
        .optional()
        .describe('Person ID filter for /me/licenses. Implies includeLicenses.'),
      includePeople: z.boolean().optional().describe('Also read /organization/people.'),
      personType: z
        .enum(['Organization', 'External', 'Basic', 'Client'])
        .optional()
        .describe('Person type filter for /organization/people. Implies includePeople.'),
      licenseId: z
        .string()
        .optional()
        .describe('Optional license UUID used to read /me/licenses/{id}/organization.')
    })
  )
  .output(
    z.object({
      profile: z.unknown().optional().describe('Profile returned by /me.'),
      organization: z
        .unknown()
        .optional()
        .describe(
          'Organization returned by /organization/information or /me/licenses/{id}/organization.'
        ),
      identifiers: z.array(z.unknown()).optional().describe('Profile identifiers.'),
      licenses: z.array(z.unknown()).optional().describe('Profile licenses.'),
      people: z.array(z.unknown()).optional().describe('Organization people.'),
      peopleCount: z.number().optional().describe('Number of people returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let licenseId = ctx.input.licenseId?.trim();

    if (ctx.input.licenseId !== undefined && !licenseId) {
      throw finagoServiceError('licenseId is required when provided.');
    }

    if (licenseId && !licenseIdPattern.test(licenseId)) {
      throw finagoServiceError('licenseId must be a UUID.');
    }

    let shouldReadIdentifiers =
      ctx.input.includeIdentifiers ||
      ctx.input.identifierType !== undefined ||
      ctx.input.identifierStatus !== undefined;
    let shouldReadLicenses =
      ctx.input.includeLicenses ||
      ctx.input.licenseOrganizationId !== undefined ||
      ctx.input.licensePersonId !== undefined;
    let shouldReadPeople = ctx.input.includePeople || ctx.input.personType !== undefined;

    let [profile, organization] = await Promise.all([
      client.get(
        '/me',
        {
          thumb: ctx.input.thumb,
          bigthumb: ctx.input.bigthumb,
          maxAge: ctx.input.maxAge
        },
        'read profile'
      ),
      licenseId
        ? client.get(
            `/me/licenses/${encodeURIComponent(licenseId)}/organization`,
            undefined,
            'read license organization'
          )
        : client.get('/organization/information', undefined, 'read organization')
    ]);

    let identifiers = shouldReadIdentifiers
      ? extractRecords(
          await client.get(
            '/me/identifiers',
            {
              type: ctx.input.identifierType,
              status: ctx.input.identifierStatus
            },
            'read identifiers'
          )
        )
      : undefined;
    let licenses = shouldReadLicenses
      ? extractRecords(
          await client.get(
            '/me/licenses',
            {
              organizationId: ctx.input.licenseOrganizationId,
              personId: ctx.input.licensePersonId
            },
            'read licenses'
          )
        )
      : undefined;
    let people = shouldReadPeople
      ? extractRecords(
          await client.get(
            '/organization/people',
            { personType: ctx.input.personType },
            'read people'
          )
        )
      : undefined;

    return {
      output: {
        profile,
        organization,
        identifiers,
        licenses,
        people,
        peopleCount: people?.length
      },
      message: `Retrieved Finago profile and organization${people ? ` with ${people.length} people` : ''}.`
    };
  })
  .build();
