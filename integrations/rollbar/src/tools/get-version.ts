import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, levelName, versionEvents } from '../lib/client';
import { spec } from '../spec';

export let getVersion = SlateTool.create(spec, {
  name: 'Get Version',
  key: 'get_version',
  description: `Retrieve details about a specific code version in a Rollbar project and optionally list items associated with it. Useful for tracking which errors appeared in a particular release.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .number()
        .optional()
        .describe('Project ID from manage_project; required with an account token.'),
      version: z.string().describe('Code version string (e.g., git SHA, semantic version)'),
      includeItems: z
        .boolean()
        .optional()
        .describe('Whether to also list items associated with this version'),
      environment: z
        .string()
        .optional()
        .describe(
          'Required for version details and items. Use list_environments to discover the name.'
        ),
      event: z
        .enum(versionEvents)
        .optional()
        .describe(
          'Required when includeItems is true: the item event associated with this version'
        ),
      page: z.number().optional().describe('Page number for items pagination')
    })
  )
  .output(
    z.object({
      version: z.string().describe('Code version'),
      versionDetails: z.any().optional().describe('Version details from Rollbar'),
      items: z
        .array(
          z.object({
            itemId: z.number().describe('Item ID'),
            counter: z.number().optional().describe('Item counter'),
            title: z.string().optional().describe('Item title'),
            status: z.string().optional().describe('Item status'),
            level: z.string().optional().describe('Severity level')
          })
        )
        .optional()
        .describe('Items associated with this version')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.includeItems && ctx.input.event === undefined)
      throw createApiServiceError(
        'event is required when includeItems is true: new, repeated, reactivated or resolved.'
      );

    let versionResult = await client.getVersion(ctx.input.version, ctx.input.environment);
    let versionDetails = versionResult?.result;

    let items:
      | { itemId: number; counter?: number; title?: string; status?: string; level?: string }[]
      | undefined;
    if (ctx.input.includeItems) {
      let itemsResult = await client.listVersionItems(ctx.input.version, {
        environment: ctx.input.environment,
        event: ctx.input.event,
        page: ctx.input.page
      });
      items = itemsResult.result.map(item => ({
        itemId: item.id,
        counter: item.counter,
        title: item.title,
        status: item.status,
        level: levelName(item.level_string ?? item.level)
      }));
    }

    return {
      output: {
        version: ctx.input.version,
        versionDetails,
        items
      },
      message: `Retrieved version \`${ctx.input.version}\`${items ? ` with **${items.length}** associated items` : ''}.`
    };
  })
  .build();
