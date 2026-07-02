import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listLibraries = SlateTool.create(spec, {
  name: 'List Libraries',
  key: 'list_libraries',
  description: `Retrieve all transformation libraries and optionally their version history. Libraries are reusable code modules shared across transformations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      libraryId: z
        .string()
        .optional()
        .describe(
          'If provided, fetch version history for this specific library instead of listing all'
        ),
      versionOrder: z.enum(['asc', 'desc']).optional().describe('Order for version listing')
    })
  )
  .output(
    z.object({
      libraries: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of libraries'),
      versions: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Version history if a specific library was queried')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.libraryId) {
      let versions = await client.getLibraryVersions(
        ctx.input.libraryId,
        ctx.input.versionOrder
      );
      let versionList = versions.versions || versions;

      return {
        output: { versions: Array.isArray(versionList) ? versionList : [versionList] },
        message: `Found **${Array.isArray(versionList) ? versionList.length : 1}** version(s) for library \`${ctx.input.libraryId}\`.`
      };
    }

    let result = await client.listLibraries();
    let list = result.libraries || result;

    return {
      output: { libraries: Array.isArray(list) ? list : [] },
      message: `Found **${Array.isArray(list) ? list.length : 0}** library(ies).`
    };
  })
  .build();
