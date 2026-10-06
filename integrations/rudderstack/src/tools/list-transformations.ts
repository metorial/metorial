import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listTransformations = SlateTool.create(spec, {
  name: 'List Transformations',
  key: 'list_transformations',
  description: `Retrieve published transformations and optionally their version history. Use this to see all transformations in your workspace or to inspect the revision history of a specific transformation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transformationId: z
        .string()
        .optional()
        .describe(
          'If provided, fetch version history for this specific transformation instead of listing all'
        ),
      versionCount: z
        .number()
        .optional()
        .describe(
          'Number of revisions to return; default 5. Use descending order for the latest revisions.'
        ),
      versionOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Order for version listing (ascending or descending by createdAt)')
    })
  )
  .output(
    z.object({
      transformations: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of transformations'),
      versions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Version history if a specific transformation was queried')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    if (ctx.input.transformationId) {
      let versions = await client.getTransformationVersions(
        ctx.input.transformationId,
        ctx.input.versionOrder,
        ctx.input.versionCount
      );
      return { output: { versions }, message: `Retrieved ${versions.length} revision(s).` };
    }
    let transformations = await client.listTransformations();
    return {
      output: { transformations },
      message: `Retrieved ${transformations.length} published transformation(s).`
    };
  })
  .build();
