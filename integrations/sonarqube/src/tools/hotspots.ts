import { z } from 'zod';
import type { SonarConfig } from '../lib/client';
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
let hotspotResolutionSchema = z.enum(['FIXED', 'SAFE', 'ACKNOWLEDGED']);

type ManageHotspotInput = {
  hotspotKey: string;
  status: z.infer<typeof hotspotStatusSchema>;
  resolution?: z.infer<typeof hotspotResolutionSchema>;
  comment?: string;
  confirmWrite?: boolean;
};

type SearchHotspotsInput = {
  resolution?: z.infer<typeof hotspotResolutionSchema>;
};

let validateHotspotResolutionForDeployment = (
  resolution: z.infer<typeof hotspotResolutionSchema> | undefined,
  config: SonarConfig | undefined
) => {
  if (resolution === 'ACKNOWLEDGED' && (config?.deployment ?? 'server') === 'cloud') {
    throw sonarqubeValidationError(
      'ACKNOWLEDGED hotspot resolution is only supported by SonarQube Server. SonarQube Cloud accepts FIXED or SAFE.'
    );
  }
};

export let validateSearchHotspotsInput = (
  input: SearchHotspotsInput,
  config?: SonarConfig
) => {
  validateHotspotResolutionForDeployment(input.resolution, config);
};

export let validateManageHotspotInput = (input: ManageHotspotInput, config?: SonarConfig) => {
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

  validateHotspotResolutionForDeployment(input.resolution, config);
};

export let searchHotspotsTool = readOnlyTool({
  name: 'Search Security Hotspots',
  key: 'search_hotspots',
  description:
    'Search SonarQube security hotspots for an exact project key by branch or pull request, project-relative files, review status, resolution, and assignee ownership. Use search_projects first when the user gave a project name or partial key. For current security issues, prefer search_issues with SECURITY quality filters.'
})
  .input(
    z.object({
      ...projectInput,
      files: z
        .array(z.string())
        .optional()
        .describe('Project-relative file paths to filter security hotspots.'),
      status: hotspotStatusSchema.optional().describe('Hotspot review status to filter.'),
      resolution: hotspotResolutionSchema
        .optional()
        .describe(
          'Hotspot resolution to filter when status is REVIEWED. ACKNOWLEDGED is supported by SonarQube Server only.'
        ),
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
    validateSearchHotspotsInput(ctx.input, ctx.config);
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
    'Read one SonarQube security hotspot by exact hotspot key without changing it. Use search_hotspots first when the hotspot key is unknown.'
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
    'Change one SonarQube security hotspot review status. Requires confirmWrite=true; status=REVIEWED requires a resolution, and status=TO_REVIEW must omit resolution.',
  instructions: [
    'Use search_hotspots or get_hotspot first when the hotspot key or current review status is unknown.',
    'When the user already provided an exact hotspot key and explicitly asks to update it, call manage_hotspot directly.',
    'Set confirmWrite to true only when the user explicitly asks to update the hotspot.',
    'ACKNOWLEDGED resolution is SonarQube Server-only; SonarQube Cloud accepts FIXED or SAFE.'
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
        .describe(
          'Required when status is REVIEWED. Omit when status is TO_REVIEW. ACKNOWLEDGED is supported by SonarQube Server only.'
        ),
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
    validateManageHotspotInput(ctx.input, ctx.config);
    let client = createClient(ctx);
    await client.changeHotspotStatus({
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
        raw: data
      },
      message: `Updated SonarQube security hotspot **${ctx.input.hotspotKey}** to **${ctx.input.status}**.`
    };
  })
  .build();
