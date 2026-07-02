import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient, validateMultiAppFilter } from './helpers';

export let listGuides = SlateTool.create(spec, {
  name: 'List Guides',
  key: 'list_guides',
  description: `List all guides in Pendo. Returns guide names, IDs, deployment status, and step details. Optionally filter by application ID for multi-app subscriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z
        .string()
        .optional()
        .describe('Application ID to filter guides for a specific app'),
      expandAll: z
        .boolean()
        .optional()
        .describe('Set to true to return guides from all apps in a multi-app subscription'),
      summarizeContent: z
        .boolean()
        .optional()
        .describe('Set to true to ask Pendo for summarized guide content fields')
    })
  )
  .output(
    z.object({
      guides: z
        .array(
          z.object({
            guideId: z.string().describe('Guide ID'),
            name: z.string().describe('Guide name'),
            state: z
              .string()
              .optional()
              .describe('Guide state (draft, staged, public, disabled)'),
            launchMethod: z.string().optional().describe('How the guide is launched'),
            isMultiStep: z
              .boolean()
              .optional()
              .describe('Whether the guide has multiple steps'),
            stepsCount: z.number().optional().describe('Number of steps in the guide')
          })
        )
        .describe('List of guides'),
      totalCount: z.number().describe('Total number of guides returned')
    })
  )
  .handleInvocation(async ctx => {
    validateMultiAppFilter(ctx.input);
    let client = createPendoClient(ctx);

    let guides = await client.listGuides({
      appId: ctx.input.appId,
      expandAll: ctx.input.expandAll,
      summarizeContent: ctx.input.summarizeContent
    });

    let mappedGuides = (Array.isArray(guides) ? guides : []).map((g: any) => ({
      guideId: g.id || g.guideId || '',
      name: g.name || g.guideName || '',
      state: g.state || g.status,
      launchMethod: g.launchMethod,
      isMultiStep: g.steps ? g.steps.length > 1 : undefined,
      stepsCount: g.steps ? g.steps.length : undefined
    }));

    return {
      output: {
        guides: mappedGuides,
        totalCount: mappedGuides.length
      },
      message: `Found **${mappedGuides.length}** guide(s) in Pendo.`
    };
  })
  .build();
