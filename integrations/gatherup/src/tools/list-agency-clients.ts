import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, readOptionalNumber } from '../lib/helpers';
import { spec } from '../spec';

export let listAgencyClients = SlateTool.create(spec, {
  name: 'List Agency Clients',
  key: 'list_agency_clients',
  description:
    'Discover agency client names and agent IDs using global agency credentials. Optionally include business locations to select the client to target in connection settings.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number, starting at 1'),
      includeBusinesses: z
        .boolean()
        .optional()
        .describe('Include business locations for each client')
    })
  )
  .output(
    z.object({
      clients: z.array(
        z.object({
          agent: z.string().describe('Client ID used as the agent connection setting'),
          name: z.string().describe('Client name'),
          businessCount: z
            .number()
            .describe('Number of businesses associated with this client'),
          businesses: z
            .array(
              z.object({
                businessId: z.string().describe('Business ID'),
                name: z.string().describe('Business name'),
                address: z.string().optional().describe('Street address'),
                city: z.string().optional().describe('City'),
                state: z.string().optional().describe('State'),
                country: z.string().optional().describe('Country'),
                zip: z.string().optional().describe('Postal code')
              })
            )
            .optional()
            .describe('Business locations, when requested')
        })
      ),
      page: z.number().describe('Current page'),
      pages: z.number().describe('Total pages'),
      totalCount: z.number().describe('Number of clients in this page')
    })
  )
  .handleInvocation(async ctx => {
    let data = await createClient(ctx).listAgencyClients({
      page: ctx.input.page,
      includeBusinesses: ctx.input.includeBusinesses ? 1 : 0
    });
    let clients = (data.clients ?? []).map(
      (client: {
        id: string | number;
        name: string;
        countBusinesses?: string | number;
        businesses?: {
          id: string | number;
          name: string;
          address?: string;
          city?: string;
          state?: string;
          country?: string;
          zip?: string;
        }[];
      }) => ({
        agent: String(client.id),
        name: client.name,
        businessCount: readOptionalNumber(client.countBusinesses) ?? 0,
        businesses: client.businesses?.map(business => ({
          businessId: String(business.id),
          name: business.name,
          address: business.address,
          city: business.city,
          state: business.state,
          country: business.country,
          zip: business.zip
        }))
      })
    );
    return {
      output: {
        clients,
        page: readOptionalNumber(data.page) ?? 1,
        pages: readOptionalNumber(data.pages) ?? 1,
        totalCount: readOptionalNumber(data.counter) ?? clients.length
      },
      message: `Found **${clients.length}** agency client(s).`
    };
  })
  .build();
