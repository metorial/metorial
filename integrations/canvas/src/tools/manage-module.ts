import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let manageModuleTool = SlateTool.create(spec, {
  name: 'Manage Module',
  key: 'manage_module',
  description: `Create, update, or delete a course module. Modules organize course content into sequential learning paths. Can also add items (assignments, pages, files, URLs, etc.) to existing modules.`,
  instructions: [
    'Use action "create" to create a new module (provide name).',
    'Use action "update" to update a module (provide moduleId).',
    'Use action "delete" to delete a module (provide moduleId).',
    'Use action "add_item" to add an item to a module (provide moduleId and item details).'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      moduleId: z
        .string()
        .optional()
        .describe('Module ID (required for update/delete/add_item)'),
      action: z.enum(['create', 'update', 'delete', 'add_item']).describe('Action to perform'),
      name: z.string().optional().describe('Module name'),
      position: z.number().optional().describe('Module position'),
      published: z.boolean().optional().describe('Whether the module is published'),
      prerequisiteModuleIds: z
        .array(z.string())
        .optional()
        .describe('IDs of prerequisite modules'),
      unlockAt: z
        .string()
        .optional()
        .nullable()
        .describe('Date to unlock the module (ISO 8601)'),
      requireSequentialProgress: z
        .boolean()
        .optional()
        .describe('Require items to be completed in order'),
      itemType: z
        .enum([
          'File',
          'Page',
          'Discussion',
          'Assignment',
          'Quiz',
          'SubHeader',
          'ExternalUrl',
          'ExternalTool'
        ])
        .optional()
        .describe('Type of item to add'),
      itemContentId: z
        .string()
        .optional()
        .describe('ID of the content to add (assignment ID, page URL, etc.)'),
      itemTitle: z.string().optional().describe('Title for SubHeader or ExternalUrl items'),
      itemExternalUrl: z
        .string()
        .optional()
        .describe('URL for ExternalUrl or ExternalTool items'),
      itemNewTab: z.boolean().optional().describe('Open external URL in new tab')
    })
  )
  .output(
    z.object({
      moduleId: z.string().describe('Module ID'),
      name: z.string().optional().describe('Module name'),
      position: z.number().optional().nullable().describe('Module position'),
      workflowState: z.string().optional().describe('published or unpublished'),
      itemsCount: z.number().optional().describe('Number of items in the module'),
      addedItemId: z
        .string()
        .optional()
        .describe('ID of the newly added item (for add_item action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let result: any;
    let actionDesc: string;

    if (ctx.input.action === 'create') {
      let moduleData: Record<string, any> = {};
      if (ctx.input.name) moduleData.name = ctx.input.name;
      if (ctx.input.position !== undefined) moduleData.position = ctx.input.position;
      if (ctx.input.unlockAt !== undefined) moduleData.unlock_at = ctx.input.unlockAt;
      if (ctx.input.requireSequentialProgress !== undefined)
        moduleData.require_sequential_progress = ctx.input.requireSequentialProgress;
      if (ctx.input.prerequisiteModuleIds) {
        moduleData.prerequisite_module_ids = ctx.input.prerequisiteModuleIds;
      }
      result = await client.createModule(ctx.input.courseId, moduleData);
      actionDesc = 'Created module';

      return {
        output: {
          moduleId: String(result.id),
          name: result.name,
          position: result.position,
          workflowState: result.workflow_state,
          itemsCount: result.items_count
        },
        message: `${actionDesc} **${result.name}** (ID: ${result.id}).`
      };
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.moduleId) throw new Error('moduleId is required for update');
      let moduleData: Record<string, any> = {};
      if (ctx.input.name) moduleData.name = ctx.input.name;
      if (ctx.input.position !== undefined) moduleData.position = ctx.input.position;
      if (ctx.input.published !== undefined) moduleData.published = ctx.input.published;
      if (ctx.input.unlockAt !== undefined) moduleData.unlock_at = ctx.input.unlockAt;
      if (ctx.input.requireSequentialProgress !== undefined)
        moduleData.require_sequential_progress = ctx.input.requireSequentialProgress;
      if (ctx.input.prerequisiteModuleIds) {
        moduleData.prerequisite_module_ids = ctx.input.prerequisiteModuleIds;
      }
      result = await client.updateModule(ctx.input.courseId, ctx.input.moduleId, moduleData);
      actionDesc = 'Updated module';

      return {
        output: {
          moduleId: String(result.id),
          name: result.name,
          position: result.position,
          workflowState: result.workflow_state,
          itemsCount: result.items_count
        },
        message: `${actionDesc} **${result.name}** (ID: ${result.id}).`
      };
    } else if (ctx.input.action === 'delete') {
      if (!ctx.input.moduleId) throw new Error('moduleId is required for delete');
      result = await client.deleteModule(ctx.input.courseId, ctx.input.moduleId);
      actionDesc = 'Deleted module';

      return {
        output: {
          moduleId: String(result.id),
          name: result.name,
          position: result.position,
          workflowState: result.workflow_state
        },
        message: `${actionDesc} **${result.name}** (ID: ${result.id}).`
      };
    } else {
      // add_item
      if (!ctx.input.moduleId) throw new Error('moduleId is required for add_item');
      if (!ctx.input.itemType) throw new Error('itemType is required for add_item');

      let itemData: Record<string, any> = {
        type: ctx.input.itemType
      };
      if (ctx.input.itemContentId) itemData.content_id = ctx.input.itemContentId;
      if (ctx.input.itemTitle) itemData.title = ctx.input.itemTitle;
      if (ctx.input.itemExternalUrl) itemData.external_url = ctx.input.itemExternalUrl;
      if (ctx.input.itemNewTab !== undefined) itemData.new_tab = ctx.input.itemNewTab;
      if (ctx.input.itemType === 'Page' && ctx.input.itemContentId) {
        itemData.page_url = ctx.input.itemContentId;
        itemData.content_id = undefined;
      }

      result = await client.createModuleItem(ctx.input.courseId, ctx.input.moduleId, itemData);
      actionDesc = 'Added item to module';

      return {
        output: {
          moduleId: ctx.input.moduleId,
          addedItemId: String(result.id)
        },
        message: `${actionDesc} ${ctx.input.moduleId}: **${result.title}** (${ctx.input.itemType}).`
      };
    }
  })
  .build();
