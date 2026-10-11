import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { halPageInfo } from '../lib/pagination';
import { spec } from '../spec';

let organizationSchema = z.object({
  organizationId: z.number().describe('Organization ID'),
  name: z.string().describe('Organization name'),
  website: z.string().nullable().optional().describe('Website'),
  domains: z.array(z.string()).optional().describe('Email domains'),
  phones: z.array(z.string()).optional().describe('Phone numbers'),
  description: z.string().nullable().optional().describe('Description'),
  location: z.string().nullable().optional().describe('Location'),
  note: z.string().nullable().optional().describe('Internal note'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  modifiedAt: z.string().optional().describe('Last modified timestamp')
});

let mapOrganization = (o: any) => ({
  organizationId: Number(o.id),
  name: o.name,
  website: o.website ?? null,
  domains: Array.isArray(o.domains) ? o.domains : undefined,
  phones: Array.isArray(o.phones) ? o.phones : undefined,
  description: o.description ?? null,
  location: o.location ?? null,
  note: o.note ?? null,
  createdAt: o.createdAt ?? undefined,
  modifiedAt: o.updatedAt ?? undefined
});

// Fields accepted by create and the full-replacement update endpoint.
// https://developer.helpscout.com/mailbox-api/endpoints/organizations/update/
let writableFields = [
  'name',
  'website',
  'domains',
  'phones',
  'description',
  'location',
  'note',
  'brandColor'
] as const;

export let manageOrganization = SlateTool.create(spec, {
  name: 'Manage Organization',
  key: 'manage_organization',
  description: `List, get, create, update, or delete organizations. Organizations represent companies that can be associated with multiple customers.`,
  instructions: [
    'update only changes the fields you provide; other organization fields are preserved.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      organizationId: z
        .number()
        .optional()
        .describe('Organization ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Organization name (required for create, optional for update)'),
      website: z.string().optional().describe('Website URL (create, update)'),
      domains: z
        .array(z.string())
        .optional()
        .describe('Email domains used to match customers, e.g. ["acme.com"] (create, update)'),
      phones: z.array(z.string()).optional().describe('Phone numbers (create, update)'),
      description: z.string().optional().describe('Description (create, update)'),
      location: z
        .string()
        .optional()
        .describe('Location, e.g. a country code (create, update)'),
      note: z.string().optional().describe('Internal note (create, update)'),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort for list: name, customerCount, conversationCount, or lastInteractionAt, optionally followed by ",asc" or ",desc" (default lastInteractionAt,desc)'
        ),
      page: z.number().optional().describe('Page number for list action')
    })
  )
  .output(
    z.object({
      organizations: z.array(organizationSchema).optional().describe('List of organizations'),
      organization: organizationSchema
        .partial()
        .extend({ organizationId: z.number(), name: z.string() })
        .optional()
        .describe('Single organization (for get, create, update)'),
      totalCount: z.number().optional().describe('Total organizations (list)'),
      currentPage: z.number().optional().describe('Current page (list)'),
      totalPages: z.number().optional().describe('Total pages (list)'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);
    let input = ctx.input;

    let providedFields = () => {
      let data: Record<string, unknown> = {};
      for (let field of writableFields) {
        let value = (input as Record<string, unknown>)[field];
        if (value !== undefined) data[field] = value;
      }
      return data;
    };

    if (input.action === 'list') {
      let data = await client.listOrganizations({ page: input.page, sort: input.sort });
      let organizations = (data?._embedded?.organizations ?? []).map(mapOrganization);
      let page = halPageInfo(data, organizations.length);

      return {
        output: { organizations, ...page, success: true },
        message: `Found **${page.totalCount}** organizations (page ${page.currentPage} of ${page.totalPages}).`
      };
    }

    if (input.action === 'get') {
      if (!input.organizationId) throw helpscoutServiceError('Organization ID is required');
      let data = await client.getOrganization(input.organizationId);
      return {
        output: { organization: mapOrganization(data), success: true },
        message: `Organization **${data.name}**.`
      };
    }

    if (input.action === 'create') {
      if (!input.name) throw helpscoutServiceError('Organization name is required');
      let result = await client.createOrganization(providedFields());
      let organizationId = result.organizationId ? Number(result.organizationId) : undefined;
      return {
        output: {
          organization:
            organizationId !== undefined ? { organizationId, name: input.name } : undefined,
          success: true
        },
        message: `Created organization **"${input.name}"**${organizationId ? ` (#${organizationId})` : ''}.`
      };
    }

    if (input.action === 'update') {
      if (!input.organizationId) throw helpscoutServiceError('Organization ID is required');
      let changes = providedFields();
      if (Object.keys(changes).length === 0) {
        throw helpscoutServiceError('Provide at least one organization field to update.');
      }

      // The update endpoint replaces the whole organization, so merge the
      // requested changes into the current record to avoid clearing fields.
      let current = await client.getOrganization(input.organizationId);
      let body: Record<string, unknown> = {};
      for (let field of writableFields) {
        if (current?.[field] !== undefined && current?.[field] !== null) {
          body[field] = current[field];
        }
      }
      Object.assign(body, changes);

      await client.replaceOrganization(input.organizationId, body);
      return {
        output: {
          organization: mapOrganization({ ...current, ...body, id: input.organizationId }),
          success: true
        },
        message: `Updated organization **#${input.organizationId}**.`
      };
    }

    if (!input.organizationId) throw helpscoutServiceError('Organization ID is required');
    await client.deleteOrganization(input.organizationId);
    return {
      output: { success: true },
      message: `Deleted organization **#${input.organizationId}**.`
    };
  })
  .build();
