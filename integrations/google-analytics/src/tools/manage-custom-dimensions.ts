import { SlateTool } from 'slates';
import { z } from 'zod';
import { AnalyticsAdminClient } from '../lib/client';
import { googleAnalyticsServiceError } from '../lib/errors';
import {
  propertyIdInstructions,
  propertyIdSchema,
  resolvePropertyId
} from '../lib/properties';
import { googleAnalyticsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageCustomDimensions = SlateTool.create(spec, {
  name: 'Manage Custom Dimensions',
  key: 'manage_custom_dimensions',
  description: `List, create, update, or archive custom dimensions on a GA4 property. Custom dimensions allow you to track additional data points beyond the built-in dimensions.

Use **list** to see all custom dimensions, **create** to add new ones, **update** to modify display names or descriptions, and **archive** to remove them.`,
  instructions: propertyIdInstructions,
  tags: {
    destructive: false
  }
})
  .scopes(googleAnalyticsActionScopes.manageCustomDimensions)
  .input(
    z.object({
      propertyId: propertyIdSchema,
      action: z
        .enum(['list', 'create', 'update', 'archive'])
        .describe('Action to perform on custom dimensions.'),
      customDimensionId: z
        .string()
        .optional()
        .describe('ID of the custom dimension (required for update and archive actions).'),
      parameterName: z
        .string()
        .optional()
        .describe(
          'Event parameter name for the custom dimension (required for create). Cannot be changed after creation.'
        ),
      displayName: z
        .string()
        .optional()
        .describe(
          'Display name for the custom dimension (required for create, optional for update).'
        ),
      description: z.string().optional().describe('Description of the custom dimension.'),
      scope: z
        .enum(['EVENT', 'USER', 'ITEM'])
        .optional()
        .describe(
          'Scope of the custom dimension (required for create). EVENT: event-scoped, USER: user-scoped, ITEM: item-scoped.'
        ),
      pageSize: z.number().optional().describe('Number of results per page for list action.'),
      pageToken: z.string().optional().describe('Page token for pagination in list action.')
    })
  )
  .output(
    z.object({
      customDimensions: z
        .array(
          z.object({
            name: z.string().optional(),
            parameterName: z.string().optional(),
            displayName: z.string().optional(),
            description: z.string().optional(),
            scope: z.string().optional(),
            disallowAdsPersonalization: z.boolean().optional()
          })
        )
        .optional()
        .describe('List of custom dimensions (for list action).'),
      customDimension: z
        .object({
          name: z.string().optional(),
          parameterName: z.string().optional(),
          displayName: z.string().optional(),
          description: z.string().optional(),
          scope: z.string().optional(),
          disallowAdsPersonalization: z.boolean().optional()
        })
        .optional()
        .describe('Created or updated custom dimension (for create/update actions).'),
      nextPageToken: z.string().optional(),
      archived: z
        .boolean()
        .optional()
        .describe('Whether the custom dimension was archived (for archive action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnalyticsAdminClient({
      token: ctx.auth.token
    });
    const propertyId = resolvePropertyId(ctx.input, ctx.config);

    if (ctx.input.action === 'list') {
      let result = await client.listCustomDimensions(propertyId, {
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });
      return {
        output: {
          customDimensions: result.customDimensions || [],
          nextPageToken: result.nextPageToken
        },
        message: `Found **${(result.customDimensions || []).length}** custom dimension(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.parameterName || !ctx.input.displayName || !ctx.input.scope) {
        throw googleAnalyticsServiceError(
          'parameterName, displayName, and scope are required for creating a custom dimension.'
        );
      }
      let result = await client.createCustomDimension(propertyId, {
        parameterName: ctx.input.parameterName,
        displayName: ctx.input.displayName,
        description: ctx.input.description,
        scope: ctx.input.scope
      });
      return {
        output: { customDimension: result },
        message: `Created custom dimension **${result.displayName}** (parameter: ${result.parameterName}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.customDimensionId) {
        throw googleAnalyticsServiceError(
          'customDimensionId is required for updating a custom dimension.'
        );
      }
      let updateFields: string[] = [];
      let body: any = {};
      if (ctx.input.displayName !== undefined) {
        updateFields.push('displayName');
        body.displayName = ctx.input.displayName;
      }
      if (ctx.input.description !== undefined) {
        updateFields.push('description');
        body.description = ctx.input.description;
      }
      if (updateFields.length === 0) {
        throw googleAnalyticsServiceError(
          'At least one field (displayName or description) must be provided for update.'
        );
      }
      let result = await client.updateCustomDimension(
        propertyId,
        ctx.input.customDimensionId,
        updateFields.join(','),
        body
      );
      return {
        output: { customDimension: result },
        message: `Updated custom dimension **${result.displayName}**.`
      };
    }

    if (ctx.input.action === 'archive') {
      if (!ctx.input.customDimensionId) {
        throw googleAnalyticsServiceError(
          'customDimensionId is required for archiving a custom dimension.'
        );
      }
      await client.archiveCustomDimension(propertyId, ctx.input.customDimensionId);
      return {
        output: { archived: true },
        message: `Archived custom dimension **${ctx.input.customDimensionId}**.`
      };
    }

    throw googleAnalyticsServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
