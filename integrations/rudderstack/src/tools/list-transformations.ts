import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listTransformations = SlateTool.create(spec, {
  name: 'List Transformations',
  key: 'list_transformations',
  description: `Retrieve all transformations and optionally their version history. Use this to see all transformations in your workspace or to inspect the revision history of a specific transformation.`,
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
      versionOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Order for version listing (ascending or descending by createdAt)')
    })
  )
  .output(
    z.object({
      transformations: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of transformations'),
      versions: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Version history if a specific transformation was queried')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.transformationId) {
      let versions = await client.getTransformationVersions(
        ctx.input.transformationId,
        ctx.input.versionOrder
      );
      let versionList = versions.versions || versions;

      return {
        output: { versions: Array.isArray(versionList) ? versionList : [versionList] },
        message: `Found **${Array.isArray(versionList) ? versionList.length : 1}** version(s) for transformation \`${ctx.input.transformationId}\`.`
      };
    }

    let result = await client.listTransformations();
    let list = result.transformations || result;

    return {
      output: { transformations: Array.isArray(list) ? list : [] },
      message: `Found **${Array.isArray(list) ? list.length : 0}** transformation(s).`
    };
  })
  .build();
