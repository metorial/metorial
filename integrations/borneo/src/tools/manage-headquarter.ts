import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList } from '../lib/responses';
import { spec } from '../spec';

export let manageHeadquarter = SlateTool.create(spec, {
  name: 'Manage Headquarter',
  key: 'manage_headquarter',
  description: `Create, retrieve, list, or delete headquarter/office location entries. Register organizational office locations with address details for compliance and organizational management.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z.enum(['create', 'get', 'list', 'delete']).describe('Action to perform'),
      nextToken: z
        .string()
        .optional()
        .describe('Continuation token from the previous list response.'),
      size: z.number().optional().describe('Maximum records to return.'),
      sortBy: z.string().optional().describe('Provider field to sort by.'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
      headquarterId: z
        .string()
        .optional()
        .describe('Headquarter ID (required for get or delete)'),
      name: z.string().optional().describe('Office/headquarter name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      country: z.string().optional().describe('Country')
    })
  )
  .output(
    z
      .object({
        headquarters: z.array(z.any()).optional(),
        headquarter: z.any().optional().describe('Headquarter record'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let { action, headquarterId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.address || !ctx.input.city || !ctx.input.country) {
          throw createApiServiceError(
            'name, address, city, and country are required for creating a headquarter'
          );
        }
        let result = await client.createHeadquarter({
          name: ctx.input.name,
          address: ctx.input.address,
          city: ctx.input.city,
          country: ctx.input.country
        });
        let data = result;
        return {
          output: { headquarter: data, success: true },
          message: `Headquarter **${ctx.input.name}** created in ${ctx.input.city}, ${ctx.input.country}.`
        };
      }
      case 'get': {
        if (!headquarterId)
          throw createApiServiceError('headquarterId is required for get action');
        let data = await client.getHeadquarter(headquarterId);
        return {
          output: { headquarter: data, success: true },
          message: `Retrieved headquarter **${headquarterId}**.`
        };
      }
      case 'list': {
        let data = await client.listHeadquarters(ctx.input);
        let headquarters = readList(data, 'headquarters');
        return {
          output: { headquarters, success: true, ...listMetadata(data) },
          message: `Retrieved ${headquarters.length} headquarters.`
        };
      }
      case 'delete': {
        if (!headquarterId)
          throw createApiServiceError('headquarterId is required for get or delete action');
        await client.deleteHeadquarter(headquarterId);
        return {
          output: { success: true },
          message: `Headquarter **${headquarterId}** deleted.`
        };
      }
    }
  })
  .build();
