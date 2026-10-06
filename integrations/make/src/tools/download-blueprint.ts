import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { count, id, invalid, z } from '../lib/schemas';
import { spec } from '../spec';

export const downloadBlueprint = SlateTool.create(spec, {
  key: 'download_blueprint',
  name: 'Download Blueprint',
  description:
    'Prepare a bounded JSON file containing the existing scenario blueprint. This reads configuration only and does not export the whole organization, run a scenario, or generate a new blueprint. The file can contain private workflow configuration.',
  tags: { readOnly: true }
})
  .input(z.object({ scenarioId: id.describe('Exact scenario ID from list_scenarios.') }))
  .output(
    z.object({
      scenarioId: id,
      filename: z.string(),
      mimeType: z.literal('application/json'),
      size: count,
      version: count.optional()
    })
  )
  .handleInvocation(async ctx => {
    const native = (await clientFor(ctx).getScenarioBlueprint(ctx.input.scenarioId)).response;
    const content = JSON.stringify(native.blueprint, null, 2),
      size = Buffer.byteLength(content),
      filename = `scenario-${ctx.input.scenarioId}-blueprint.json`;
    if (size > 8 * 1024 * 1024)
      throw invalid(
        'The existing blueprint exceeds the 8 MiB JSON download bound. Read a smaller blueprint.'
      );
    await ctx.addAttachment({
      type: 'content',
      content: new Response(content, { headers: { 'content-type': 'application/json' } }),
      filename
    });
    return {
      output: {
        scenarioId: ctx.input.scenarioId,
        filename,
        mimeType: 'application/json' as const,
        size,
        version: native.version
      },
      message: 'Prepared the existing blueprint as a downloadable JSON file.'
    };
  })
  .build();
