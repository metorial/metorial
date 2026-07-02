import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let contentModuleSchema = z.object({
  moduleId: z.string().describe('Module ID'),
  title: z.string().optional().describe('Module title'),
  shortTitle: z.string().optional().describe('Short title'),
  isHidden: z.boolean().optional().describe('Whether the module is hidden'),
  isLocked: z.boolean().optional().describe('Whether the module is locked'),
  startDate: z.string().optional().describe('Module start date'),
  endDate: z.string().optional().describe('Module end date'),
  dueDate: z.string().optional().describe('Module due date'),
  lastModifiedDate: z.string().optional().describe('Last modified date'),
  description: z.string().optional().describe('Module description')
});

export let listContentModules = SlateTool.create(spec, {
  name: 'List Content Modules',
  key: 'list_content_modules',
  description: `List root-level content modules for a course, or get the structure (children) of a specific module. Returns module titles, visibility, dates, and nested structure.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      moduleId: z
        .string()
        .optional()
        .describe(
          'If provided, returns the children/structure of this specific module instead of root modules'
        )
    })
  )
  .output(
    z.object({
      modules: z.array(contentModuleSchema).describe('List of content modules')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result: any;
    if (ctx.input.moduleId) {
      result = await client.getModuleStructure(ctx.input.orgUnitId, ctx.input.moduleId);
    } else {
      result = await client.listContentModules(ctx.input.orgUnitId);
    }

    let items = Array.isArray(result) ? result : [];
    let modules = items.map((m: any) => ({
      moduleId: String(m.Id),
      title: m.Title,
      shortTitle: m.ShortTitle,
      isHidden: m.IsHidden,
      isLocked: m.IsLocked,
      startDate: m.ModuleStartDate,
      endDate: m.ModuleEndDate,
      dueDate: m.ModuleDueDate,
      lastModifiedDate: m.LastModifiedDate,
      description: m.Description?.Text || m.Description?.Content
    }));

    return {
      output: { modules },
      message: `Found **${modules.length}** content module(s)${ctx.input.moduleId ? ` under module ${ctx.input.moduleId}` : ''}.`
    };
  })
  .build();

export let createContentModule = SlateTool.create(spec, {
  name: 'Create Content Module',
  key: 'create_content_module',
  description: `Create a new content module in a course. Can be created as a root module or as a child of an existing module.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      title: z.string().describe('Module title'),
      parentModuleId: z
        .string()
        .optional()
        .describe('Parent module ID (creates as child module). Omit for root module.'),
      shortTitle: z.string().optional().describe('Short title'),
      description: z.string().optional().describe('Module description (HTML supported)'),
      isHidden: z.boolean().optional().describe('Whether the module is hidden from students'),
      startDate: z.string().optional().describe('Module start date (ISO 8601)'),
      endDate: z.string().optional().describe('Module end date (ISO 8601)'),
      dueDate: z.string().optional().describe('Module due date (ISO 8601)')
    })
  )
  .output(
    z.object({
      moduleId: z.string().describe('New module ID'),
      title: z.string().optional().describe('Module title')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let moduleData: any = {
      Title: ctx.input.title,
      ShortTitle: ctx.input.shortTitle || ctx.input.title,
      Type: 0 // Module type
    };

    if (ctx.input.description) {
      moduleData.Description = { Content: ctx.input.description, Type: 'Html' };
    }
    if (ctx.input.isHidden !== undefined) moduleData.IsHidden = ctx.input.isHidden;
    if (ctx.input.startDate) moduleData.ModuleStartDate = ctx.input.startDate;
    if (ctx.input.endDate) moduleData.ModuleEndDate = ctx.input.endDate;
    if (ctx.input.dueDate) moduleData.ModuleDueDate = ctx.input.dueDate;

    let result: any;
    if (ctx.input.parentModuleId) {
      result = await client.createChildModule(
        ctx.input.orgUnitId,
        ctx.input.parentModuleId,
        moduleData
      );
    } else {
      result = await client.createContentModule(ctx.input.orgUnitId, moduleData);
    }

    return {
      output: {
        moduleId: String(result.Id),
        title: result.Title
      },
      message: `Created content module **${result.Title}** (ID: ${result.Id})${ctx.input.parentModuleId ? ` under module ${ctx.input.parentModuleId}` : ''}.`
    };
  })
  .build();

export let updateContentModule = SlateTool.create(spec, {
  name: 'Update Content Module',
  key: 'update_content_module',
  description: `Update an existing content module's title, description, visibility, or dates.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      moduleId: z.string().describe('Module ID to update'),
      title: z.string().optional().describe('Updated title'),
      shortTitle: z.string().optional().describe('Updated short title'),
      description: z.string().optional().describe('Updated description (HTML supported)'),
      isHidden: z.boolean().optional().describe('Set visibility'),
      isLocked: z.boolean().optional().describe('Set locked status'),
      startDate: z.string().optional().describe('Updated start date (ISO 8601)'),
      endDate: z.string().optional().describe('Updated end date (ISO 8601)'),
      dueDate: z.string().optional().describe('Updated due date (ISO 8601)')
    })
  )
  .output(
    z.object({
      moduleId: z.string().describe('Updated module ID'),
      title: z.string().optional().describe('Updated title')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let updateData: any = {};
    if (ctx.input.title !== undefined) updateData.Title = ctx.input.title;
    if (ctx.input.shortTitle !== undefined) updateData.ShortTitle = ctx.input.shortTitle;
    if (ctx.input.description !== undefined)
      updateData.Description = { Content: ctx.input.description, Type: 'Html' };
    if (ctx.input.isHidden !== undefined) updateData.IsHidden = ctx.input.isHidden;
    if (ctx.input.isLocked !== undefined) updateData.IsLocked = ctx.input.isLocked;
    if (ctx.input.startDate !== undefined) updateData.ModuleStartDate = ctx.input.startDate;
    if (ctx.input.endDate !== undefined) updateData.ModuleEndDate = ctx.input.endDate;
    if (ctx.input.dueDate !== undefined) updateData.ModuleDueDate = ctx.input.dueDate;

    let result = await client.updateContentModule(
      ctx.input.orgUnitId,
      ctx.input.moduleId,
      updateData
    );

    return {
      output: {
        moduleId: String(result.Id),
        title: result.Title
      },
      message: `Updated content module **${result.Title}** (ID: ${result.Id}).`
    };
  })
  .build();

export let deleteContentModule = SlateTool.create(spec, {
  name: 'Delete Content Module',
  key: 'delete_content_module',
  description: `Delete a content module from a course. This also removes all nested content within the module.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      moduleId: z.string().describe('Module ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteContentModule(ctx.input.orgUnitId, ctx.input.moduleId);

    return {
      output: { success: true },
      message: `Deleted content module (ID: ${ctx.input.moduleId}).`
    };
  })
  .build();
