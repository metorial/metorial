import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let listLibraries = SlateTool.create(spec, {
  name: 'List Libraries',
  key: 'list_libraries',
  description: `Retrieve published transformation libraries and optionally their version history. Libraries are reusable code modules shared across transformations.`,
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
      versionCount: z
        .number()
        .optional()
        .describe(
          'Number of revisions to return; default 5. Use descending order for the latest revisions.'
        ),
      versionOrder: z.enum(['asc', 'desc']).optional().describe('Order for version listing')
    })
  )
  .output(
    z.object({
      libraries: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of libraries'),
      versions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Version history if a specific library was queried')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    if (ctx.input.libraryId) {
      let versions = await client.getLibraryVersions(
        ctx.input.libraryId,
        ctx.input.versionOrder,
        ctx.input.versionCount
      );
      return { output: { versions }, message: `Retrieved ${versions.length} revision(s).` };
    }
    let libraries = await client.listLibraries();
    return {
      output: { libraries },
      message: `Retrieved ${libraries.length} published library(s).`
    };
  })
  .build();
