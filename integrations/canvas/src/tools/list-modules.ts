import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let listModulesTool = SlateTool.create(spec, {
  name: 'List Modules',
  key: 'list_modules',
  description: `List all modules in a course. Modules organize content into sequential learning paths. Optionally include module items (assignments, pages, files, etc.) within each module.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.string().describe('The Canvas course ID'),
      searchTerm: z.string().optional().describe('Partial module name to search for'),
      includeItems: z.boolean().optional().describe('Include module items in the response')
    })
  )
  .output(
    z.object({
      modules: z.array(
        z.object({
          moduleId: z.string().describe('Module ID'),
          name: z.string().describe('Module name'),
          position: z.number().optional().nullable().describe('Module position'),
          workflowState: z.string().optional().describe('published or unpublished'),
          unlockAt: z.string().optional().nullable().describe('Unlock date'),
          requireSequentialProgress: z
            .boolean()
            .optional()
            .describe('Must items be completed in order'),
          itemsCount: z.number().optional().describe('Number of items'),
          items: z
            .array(
              z.object({
                itemId: z.string().describe('Module item ID'),
                title: z.string().describe('Item title'),
                itemType: z.string().describe('Item type (Assignment, Page, File, etc.)'),
                contentId: z.string().optional().nullable().describe('Content ID'),
                position: z.number().optional().nullable().describe('Item position in module'),
                externalUrl: z
                  .string()
                  .optional()
                  .nullable()
                  .describe('External URL if applicable')
              })
            )
            .optional()
            .describe('Module items (if included)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let include: string[] = [];
    if (ctx.input.includeItems) include.push('items');

    let raw = await client.listModules(ctx.input.courseId, {
      searchTerm: ctx.input.searchTerm,
      include: include.length > 0 ? include : undefined
    });

    let modules = raw.map((m: any) => ({
      moduleId: String(m.id),
      name: m.name,
      position: m.position,
      workflowState: m.workflow_state,
      unlockAt: m.unlock_at,
      requireSequentialProgress: m.require_sequential_progress,
      itemsCount: m.items_count,
      items: m.items?.map((item: any) => ({
        itemId: String(item.id),
        title: item.title,
        itemType: item.type,
        contentId: item.content_id ? String(item.content_id) : null,
        position: item.position,
        externalUrl: item.external_url
      }))
    }));

    return {
      output: { modules },
      message: `Found **${modules.length}** module(s) in course ${ctx.input.courseId}.`
    };
  })
  .build();
