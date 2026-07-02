import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { mailchimpServiceError } from '../lib/errors';
import { spec } from '../spec';

let categorySchema = z.object({
  categoryId: z.string(),
  title: z.string(),
  type: z.string(),
  displayOrder: z.number().optional()
});

let interestSchema = z.object({
  interestId: z.string(),
  categoryId: z.string().optional(),
  name: z.string(),
  subscriberCount: z.union([z.string(), z.number()]).optional(),
  displayOrder: z.number().optional()
});

let mapCategory = (category: any) => ({
  categoryId: category.id,
  title: category.title,
  type: category.type,
  displayOrder: category.display_order
});

let mapInterest = (interest: any) => ({
  interestId: interest.id,
  categoryId: interest.category_id,
  name: interest.name,
  subscriberCount: interest.subscriber_count,
  displayOrder: interest.display_order
});

export let manageInterestGroupsTool = SlateTool.create(spec, {
  name: 'Manage Interest Groups',
  key: 'manage_interest_groups',
  description:
    'List, get, create, update, or delete audience interest categories and interests. Interest categories are group titles; interests are group names that contacts can be assigned to.',
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('Audience ID'),
      resource: z
        .enum(['category', 'interest'])
        .describe('Manage an interest category or an individual interest'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .optional()
        .describe('Action to perform. Defaults to "list".'),
      categoryId: z
        .string()
        .optional()
        .describe(
          'Interest category ID. Required for interest actions and category get/update/delete.'
        ),
      interestId: z.string().optional().describe('Interest ID for get/update/delete'),
      title: z.string().optional().describe('Category title'),
      type: z
        .enum(['checkboxes', 'dropdown', 'radio', 'hidden'])
        .optional()
        .describe('Category type. Required when creating a category.'),
      name: z.string().optional().describe('Interest name'),
      displayOrder: z.number().optional().describe('Display order'),
      count: z.number().optional().describe('Number of records to return when listing'),
      offset: z.number().optional().describe('Number of records to skip when listing')
    })
  )
  .output(
    z.object({
      categories: z.array(categorySchema).optional(),
      category: categorySchema.optional(),
      interests: z.array(interestSchema).optional(),
      interest: interestSchema.optional(),
      deleted: z.boolean().optional(),
      totalItems: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let action = ctx.input.action ?? 'list';

    if (ctx.input.resource === 'category') {
      if (action === 'list') {
        let result = await client.getInterestCategories(ctx.input.listId, {
          count: ctx.input.count,
          offset: ctx.input.offset
        });
        let categories = (result.categories ?? []).map(mapCategory);

        return {
          output: {
            categories,
            totalItems: result.total_items ?? 0
          },
          message: `Found **${categories.length}** interest categor(ies) in audience ${ctx.input.listId}.`
        };
      }

      if (action === 'get') {
        if (!ctx.input.categoryId) {
          throw mailchimpServiceError('categoryId is required to get an interest category.');
        }

        let result = await client.getInterestCategory(ctx.input.listId, ctx.input.categoryId);
        let category = mapCategory(result);

        return {
          output: { category },
          message: `Retrieved interest category **${category.title}**.`
        };
      }

      if (action === 'delete') {
        if (!ctx.input.categoryId) {
          throw mailchimpServiceError(
            'categoryId is required to delete an interest category.'
          );
        }

        await client.deleteInterestCategory(ctx.input.listId, ctx.input.categoryId);

        return {
          output: { deleted: true },
          message: `Interest category **${ctx.input.categoryId}** has been deleted.`
        };
      }

      if (action === 'create') {
        if (!ctx.input.title || !ctx.input.type) {
          throw mailchimpServiceError(
            'title and type are required to create an interest category.'
          );
        }

        let result = await client.createInterestCategory(ctx.input.listId, {
          title: ctx.input.title,
          type: ctx.input.type,
          ...(ctx.input.displayOrder !== undefined
            ? { display_order: ctx.input.displayOrder }
            : {})
        });
        let category = mapCategory(result);

        return {
          output: { category },
          message: `Interest category **${category.title}** has been created.`
        };
      }

      if (!ctx.input.categoryId) {
        throw mailchimpServiceError('categoryId is required to update an interest category.');
      }

      let updateData: Record<string, any> = {};
      if (ctx.input.title) updateData.title = ctx.input.title;
      if (ctx.input.type) updateData.type = ctx.input.type;
      if (ctx.input.displayOrder !== undefined)
        updateData.display_order = ctx.input.displayOrder;
      if (Object.keys(updateData).length === 0) {
        throw mailchimpServiceError(
          'At least one field must be provided to update an interest category.'
        );
      }

      let result = await client.updateInterestCategory(
        ctx.input.listId,
        ctx.input.categoryId,
        updateData
      );
      let category = mapCategory(result);

      return {
        output: { category },
        message: `Interest category **${category.title}** has been updated.`
      };
    }

    if (!ctx.input.categoryId) {
      throw mailchimpServiceError('categoryId is required to manage interests.');
    }

    if (action === 'list') {
      let result = await client.getInterests(ctx.input.listId, ctx.input.categoryId, {
        count: ctx.input.count,
        offset: ctx.input.offset
      });
      let interests = (result.interests ?? []).map(mapInterest);

      return {
        output: {
          interests,
          totalItems: result.total_items ?? 0
        },
        message: `Found **${interests.length}** interest(s) in category ${ctx.input.categoryId}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.interestId) {
        throw mailchimpServiceError('interestId is required to get an interest.');
      }

      let result = await client.getInterest(
        ctx.input.listId,
        ctx.input.categoryId,
        ctx.input.interestId
      );
      let interest = mapInterest(result);

      return {
        output: { interest },
        message: `Retrieved interest **${interest.name}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.interestId) {
        throw mailchimpServiceError('interestId is required to delete an interest.');
      }

      await client.deleteInterest(
        ctx.input.listId,
        ctx.input.categoryId,
        ctx.input.interestId
      );

      return {
        output: { deleted: true },
        message: `Interest **${ctx.input.interestId}** has been deleted.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw mailchimpServiceError('name is required to create an interest.');
      }

      let result = await client.createInterest(ctx.input.listId, ctx.input.categoryId, {
        name: ctx.input.name,
        ...(ctx.input.displayOrder !== undefined
          ? { display_order: ctx.input.displayOrder }
          : {})
      });
      let interest = mapInterest(result);

      return {
        output: { interest },
        message: `Interest **${interest.name}** has been created.`
      };
    }

    if (!ctx.input.interestId) {
      throw mailchimpServiceError('interestId is required to update an interest.');
    }

    let updateData: Record<string, any> = {};
    if (ctx.input.name) updateData.name = ctx.input.name;
    if (ctx.input.displayOrder !== undefined)
      updateData.display_order = ctx.input.displayOrder;
    if (Object.keys(updateData).length === 0) {
      throw mailchimpServiceError(
        'At least one field must be provided to update an interest.'
      );
    }

    let result = await client.updateInterest(
      ctx.input.listId,
      ctx.input.categoryId,
      ctx.input.interestId,
      updateData
    );
    let interest = mapInterest(result);

    return {
      output: { interest },
      message: `Interest **${interest.name}** has been updated.`
    };
  })
  .build();
