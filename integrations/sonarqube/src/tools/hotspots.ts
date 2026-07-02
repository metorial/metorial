import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import {
  branchPullRequestInputs,
  createClient,
  createSonarTool,
  hotspotSchema,
  mapHotspot,
  pageSchema,
  paginationInputs,
  projectInput,
  projectKeyFromInput,
  rawRecordSchema,
  readOnlyTool
} from './shared';

let hotspotStatusSchema = z.enum(['TO_REVIEW', 'REVIEWED']);
let hotspotResolutionSchema = z.enum(['FIXED', 'SAFE']);

type ManageHotspotInput = {
  hotspotKey: string;
  status: z.infer<typeof hotspotStatusSchema>;
  resolution?: z.infer<typeof hotspotResolutionSchema>;
  comment?: string;
  confirmWrite?: boolean;
};

export let validateManageHotspotInput = (input: ManageHotspotInput) => {
  if (input.confirmWrite !== true) {
    throw sonarqubeValidationError(
      'confirmWrite must be true to manage a SonarQube security hotspot.'
    );
  }

  if (input.status === 'REVIEWED' && !input.resolution) {
    throw sonarqubeValidationError('resolution is required when status is REVIEWED.');
  }

  if (input.status === 'TO_REVIEW' && input.resolution) {
    throw sonarqubeValidationError('resolution cannot be provided when status is TO_REVIEW.');
  }
};

export let searchHotspotsTool = readOnlyTool({
  name: 'Search Security Hotspots',
  key: 'search_hotspots',
  description:
    'Search SonarQube security hotspots for a project by branch, pull request, files, review status, resolution, and assignee ownership.'
})
  .input(
    z.object({
      ...projectInput,
      files: z
        .array(z.string())
        .optional()
        .describe('File component keys to filter security hotspots.'),
      status: hotspotStatusSchema.optional().describe('Hotspot review status to filter.'),
      resolution: hotspotResolutionSchema
        .optional()
        .describe('Hotspot resolution to filter when status is REVIEWED.'),
      onlyMine: z
        .boolean()
        .optional()
        .describe('Filter to hotspots assigned to the token user.'),
      ...branchPullRequestInputs,
      ...paginationInputs(100, 500)
    })
  )
  .output(
    z.object({
      projectKey: z.string().describe('Project key used for the request.'),
      hotspots: z.array(hotspotSchema).describe('Matching SonarQube security hotspots.'),
      page: pageSchema.optional().describe('Pagination details.')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.searchHotspots({
      projectKey,
      files: ctx.input.files,
      status: ctx.input.status,
      resolution: ctx.input.resolution,
      onlyMine: ctx.input.onlyMine,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });
    let hotspots = result.items.map(mapHotspot);

    return {
      output: {
        projectKey,
        hotspots,
        page: result.page
      },
      message: `Found **${hotspots.length}** SonarQube security hotspots for project **${projectKey}**.`
    };
  })
  .build();

export let getHotspotTool = readOnlyTool({
  name: 'Get Security Hotspot',
  key: 'get_hotspot',
  description:
    'Get one SonarQube security hotspot by hotspot key, including normalized hotspot metadata and raw provider fields.'
})
  .input(
    z.object({
      hotspotKey: z.string().describe('SonarQube security hotspot key.')
    })
  )
  .output(
    z.object({
      hotspotKey: z.string().describe('Hotspot key used for the request.'),
      hotspot: hotspotSchema.describe('Normalized SonarQube security hotspot.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getHotspot(ctx.input.hotspotKey);
    let hotspot =
      typeof data.hotspot === 'object' && data.hotspot !== null
        ? (data.hotspot as Record<string, unknown>)
        : data;

    return {
      output: {
        hotspotKey: ctx.input.hotspotKey,
        hotspot: mapHotspot(hotspot),
        raw: data
      },
      message: `Retrieved SonarQube security hotspot **${ctx.input.hotspotKey}**.`
    };
  })
  .build();

export let manageHotspotTool = createSonarTool({
  name: 'Manage Security Hotspot',
  key: 'manage_hotspot',
  description:
    'Change a SonarQube security hotspot review status and optional resolution. Requires confirmWrite to be true.',
  instructions: [
    'Use search_hotspots or get_hotspot first to identify the hotspot key and current review status.',
    'Set confirmWrite to true only when the user explicitly asks to update the hotspot.'
  ],
  readOnly: false,
  destructive: false
})
  .input(
    z.object({
      hotspotKey: z.string().describe('SonarQube security hotspot key.'),
      status: hotspotStatusSchema.describe('New hotspot review status.'),
      resolution: hotspotResolutionSchema
        .optional()
        .describe('Required when status is REVIEWED. Omit when status is TO_REVIEW.'),
      comment: z.string().optional().describe('Optional review comment.'),
      confirmWrite: z
        .boolean()
        .optional()
        .describe('Must be true to perform a SonarQube security hotspot mutation.')
    })
  )
  .output(
    z.object({
      hotspotKey: z.string().describe('Hotspot key used for the request.'),
      status: hotspotStatusSchema.describe('Requested hotspot review status.'),
      resolution: hotspotResolutionSchema.optional().describe('Requested hotspot resolution.'),
      hotspot: hotspotSchema.optional().describe('Hotspot state read after mutation.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    validateManageHotspotInput(ctx.input);
    let client = createClient(ctx);
    let raw = await client.changeHotspotStatus({
      hotspotKey: ctx.input.hotspotKey,
      status: ctx.input.status,
      resolution: ctx.input.resolution,
      comment: ctx.input.comment
    });
    let data = await client.getHotspot(ctx.input.hotspotKey);
    let hotspot =
      typeof data.hotspot === 'object' && data.hotspot !== null
        ? (data.hotspot as Record<string, unknown>)
        : data;

    return {
      output: {
        hotspotKey: ctx.input.hotspotKey,
        status: ctx.input.status,
        resolution: ctx.input.resolution,
        hotspot: mapHotspot(hotspot),
        raw
      },
      message: `Updated SonarQube security hotspot **${ctx.input.hotspotKey}** to **${ctx.input.status}**.`
    };
  })
  .build();
