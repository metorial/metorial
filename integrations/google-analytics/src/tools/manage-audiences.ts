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

let asArray = (value: unknown) => (Array.isArray(value) ? value : []);

let normalizeAudienceFilterExpression = (expression: any): any => {
  if (!expression || typeof expression !== 'object') {
    return expression;
  }

  if (expression.andGroup) {
    return {
      ...expression,
      andGroup: {
        ...expression.andGroup,
        filterExpressions: asArray(expression.andGroup.filterExpressions).map(child =>
          child?.orGroup
            ? child
            : {
                orGroup: {
                  filterExpressions: [child]
                }
              }
        )
      }
    };
  }

  return {
    andGroup: {
      filterExpressions: [
        expression.orGroup
          ? expression
          : {
              orGroup: {
                filterExpressions: [expression]
              }
            }
      ]
    }
  };
};

let normalizeAudienceFilterClauses = (
  filterClauses: Array<{ simpleFilter?: { filterExpression?: any }; [key: string]: any }>
) =>
  filterClauses.map(clause => {
    let expression = clause.simpleFilter?.filterExpression;

    if (!expression) {
      return clause;
    }

    return {
      ...clause,
      simpleFilter: {
        ...clause.simpleFilter,
        filterExpression: normalizeAudienceFilterExpression(expression)
      }
    };
  });

export let manageAudiences = SlateTool.create(spec, {
  name: 'Manage Audiences',
  key: 'manage_audiences',
  description: `List, create, update, or archive audiences on a GA4 property. Audiences are groups of users segmented by attributes or behaviors, used for targeted analysis and remarketing.

Use **list** to see all audiences, **create** to define new audience segments, **update** to modify audience display name or description, and **archive** to remove them.`,
  instructions: propertyIdInstructions,
  tags: {
    destructive: false
  }
})
  .scopes(googleAnalyticsActionScopes.manageAudiences)
  .input(
    z.object({
      propertyId: propertyIdSchema,
      action: z
        .enum(['list', 'create', 'update', 'archive'])
        .describe('Action to perform on audiences.'),
      audienceId: z
        .string()
        .optional()
        .describe('ID of the audience (required for update and archive actions).'),
      displayName: z
        .string()
        .optional()
        .describe('Display name for the audience (required for create, optional for update).'),
      description: z.string().optional().describe('Description of the audience.'),
      membershipDurationDays: z
        .number()
        .optional()
        .describe(
          'Duration in days that a user remains in the audience (for create). Max 540. Set to -1 for maximum duration.'
        ),
      filterClauses: z
        .array(
          z.object({
            clauseType: z
              .enum(['INCLUDE', 'EXCLUDE'])
              .optional()
              .describe('Whether to include or exclude users matching this clause.'),
            simpleFilter: z
              .object({
                scope: z
                  .enum([
                    'AUDIENCE_FILTER_SCOPE_UNSPECIFIED',
                    'AUDIENCE_FILTER_SCOPE_WITHIN_SAME_EVENT',
                    'AUDIENCE_FILTER_SCOPE_WITHIN_SAME_SESSION',
                    'AUDIENCE_FILTER_SCOPE_ACROSS_ALL_SESSIONS'
                  ])
                  .optional(),
                filterExpression: z.any().describe('The filter expression for this clause.')
              })
              .optional()
          })
        )
        .optional()
        .describe('Filter clauses defining the audience criteria (for create).'),
      pageSize: z.number().optional(),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      audiences: z
        .array(
          z.object({
            name: z.string().optional(),
            displayName: z.string().optional(),
            description: z.string().optional(),
            membershipDurationDays: z.number().optional(),
            adsPersonalizationEnabled: z.boolean().optional()
          })
        )
        .optional(),
      audience: z
        .object({
          name: z.string().optional(),
          displayName: z.string().optional(),
          description: z.string().optional(),
          membershipDurationDays: z.number().optional(),
          adsPersonalizationEnabled: z.boolean().optional()
        })
        .optional(),
      archived: z.boolean().optional(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AnalyticsAdminClient({
      token: ctx.auth.token
    });
    const propertyId = resolvePropertyId(ctx.input, ctx.config);

    if (ctx.input.action === 'list') {
      let result = await client.listAudiences(propertyId, {
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      });
      let audiences = result.audiences || [];
      return {
        output: {
          audiences,
          nextPageToken: result.nextPageToken
        },
        message: `Found **${audiences.length}** audience(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.displayName || !ctx.input.filterClauses) {
        throw googleAnalyticsServiceError(
          'displayName and filterClauses are required for creating an audience.'
        );
      }
      let body: any = {
        displayName: ctx.input.displayName,
        description: ctx.input.description,
        membershipDurationDays: ctx.input.membershipDurationDays || 30,
        filterClauses: normalizeAudienceFilterClauses(ctx.input.filterClauses)
      };
      let result = await client.createAudience(propertyId, body);
      return {
        output: { audience: result },
        message: `Created audience **${result.displayName}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.audienceId)
        throw googleAnalyticsServiceError('audienceId is required for update action.');
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
      let result = await client.updateAudience(
        propertyId,
        ctx.input.audienceId,
        updateFields.join(','),
        body
      );
      return {
        output: { audience: result },
        message: `Updated audience **${result.displayName}**.`
      };
    }

    if (ctx.input.action === 'archive') {
      if (!ctx.input.audienceId)
        throw googleAnalyticsServiceError('audienceId is required for archive action.');
      await client.archiveAudience(propertyId, ctx.input.audienceId);
      return {
        output: { archived: true },
        message: `Archived audience **${ctx.input.audienceId}**.`
      };
    }

    throw googleAnalyticsServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
