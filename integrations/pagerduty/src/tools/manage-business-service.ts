import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { pagerDutyServiceError } from '../lib/errors';
import type { PagerDutyBusinessService } from '../lib/types';
import { spec } from '../spec';

let formatBusinessService = (businessService: PagerDutyBusinessService) => ({
  businessServiceId: businessService.id,
  name: businessService.name ?? businessService.summary,
  description: businessService.description ?? undefined,
  pointOfContact: businessService.point_of_contact ?? undefined,
  teamId: businessService.team?.id,
  teamName: businessService.team?.summary,
  htmlUrl: businessService.html_url
});

let hasBusinessServiceUpdate = (input: {
  name?: string;
  description?: string;
  pointOfContact?: string;
  teamId?: string;
}) =>
  input.name !== undefined ||
  input.description !== undefined ||
  input.pointOfContact !== undefined ||
  input.teamId !== undefined;

export let manageBusinessService = SlateTool.create(spec, {
  name: 'Manage Business Service',
  key: 'manage_business_service',
  description: `List, get, create, update, or delete PagerDuty business services. Business services represent customer-facing capabilities and are used to track impacts across technical services.`,
  instructions: [
    'Set **action** to "list", "get", "create", "update", or "delete".',
    'For create, **name** is required.',
    'For get/update/delete, **businessServiceId** is required.',
    'For update, provide at least one of **name**, **description**, **pointOfContact**, or **teamId**.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      businessServiceId: z.string().optional().describe('Business service ID'),
      name: z.string().optional().describe('Business service name'),
      description: z.string().optional().describe('Business service description'),
      pointOfContact: z.string().optional().describe('Point of contact'),
      teamId: z.string().optional().describe('Team ID that owns the business service'),
      query: z.string().optional().describe('Search query for list action'),
      teamIds: z.array(z.string()).optional().describe('Filter list results by team IDs'),
      limit: z.number().optional().describe('Max results for list'),
      offset: z.number().optional().describe('Pagination offset for list')
    })
  )
  .output(
    z.object({
      businessServices: z
        .array(
          z.object({
            businessServiceId: z.string().describe('Business service ID'),
            name: z.string().optional().describe('Business service name'),
            description: z.string().optional().describe('Description'),
            pointOfContact: z.string().optional().describe('Point of contact'),
            teamId: z.string().optional().describe('Team ID'),
            teamName: z.string().optional().describe('Team name'),
            htmlUrl: z.string().optional().describe('Web URL')
          })
        )
        .optional()
        .describe('Business services for list action'),
      businessServiceId: z.string().optional().describe('Business service ID'),
      name: z.string().optional().describe('Business service name'),
      description: z.string().optional().describe('Description'),
      pointOfContact: z.string().optional().describe('Point of contact'),
      teamId: z.string().optional().describe('Team ID'),
      teamName: z.string().optional().describe('Team name'),
      htmlUrl: z.string().optional().describe('Web URL'),
      deleted: z.boolean().optional().describe('Whether the business service was deleted'),
      more: z.boolean().optional().describe('Whether more list results are available'),
      total: z.number().optional().describe('Total count for list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let result = await client.listBusinessServices({
        query: ctx.input.query,
        teamIds: ctx.input.teamIds,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      return {
        output: {
          businessServices: result.business_services.map(formatBusinessService),
          more: result.more,
          total: result.total
        },
        message: `Found **${result.total}** business service(s). Returned ${result.business_services.length} result(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.businessServiceId)
        throw pagerDutyServiceError(
          'businessServiceId is required for getting a business service'
        );

      let businessService = await client.getBusinessService(ctx.input.businessServiceId);

      return {
        output: formatBusinessService(businessService),
        message: `Fetched business service **${businessService.name ?? businessService.id}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name)
        throw pagerDutyServiceError('name is required for creating a business service');

      let businessService = await client.createBusinessService({
        name: ctx.input.name,
        description: ctx.input.description,
        pointOfContact: ctx.input.pointOfContact,
        teamId: ctx.input.teamId
      });

      return {
        output: formatBusinessService(businessService),
        message: `Created business service **${businessService.name ?? businessService.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.businessServiceId)
        throw pagerDutyServiceError(
          'businessServiceId is required for updating a business service'
        );
      if (!hasBusinessServiceUpdate(ctx.input))
        throw pagerDutyServiceError(
          'Provide at least one business service property to update.'
        );

      let businessService = await client.updateBusinessService(ctx.input.businessServiceId, {
        name: ctx.input.name,
        description: ctx.input.description,
        pointOfContact: ctx.input.pointOfContact,
        teamId: ctx.input.teamId
      });

      return {
        output: formatBusinessService(businessService),
        message: `Updated business service **${businessService.name ?? businessService.id}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.businessServiceId)
        throw pagerDutyServiceError(
          'businessServiceId is required for deleting a business service'
        );

      await client.deleteBusinessService(ctx.input.businessServiceId);

      return {
        output: {
          businessServiceId: ctx.input.businessServiceId,
          deleted: true
        },
        message: `Deleted business service \`${ctx.input.businessServiceId}\`.`
      };
    }

    throw pagerDutyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
