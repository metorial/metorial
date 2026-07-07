import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import {
  branchPullRequestInputs,
  createClient,
  createSonarTool,
  readOnlyTool
} from './shared';

let hotspotStatusSchema = z.enum(['TO_REVIEW', 'REVIEWED']);
let hotspotResolutionSchema = z.enum(['FIXED', 'SAFE', 'ACKNOWLEDGED']);

type ManageHotspotInput = {
  hotspotKey: string;
  status: z.infer<typeof hotspotStatusSchema>;
  resolution?: z.infer<typeof hotspotResolutionSchema>;
  comment?: string;
};

type SearchHotspotsInput = {
  projectKey?: string;
  hotspotKeys?: string[];
  resolution?: z.infer<typeof hotspotResolutionSchema>;
};

let hasSearchHotspotKey = (hotspotKeys: string[] | undefined) =>
  hotspotKeys?.some(value => value.trim().length > 0) === true;

export let validateSearchHotspotsInput = (input: SearchHotspotsInput) => {
  if (!input.projectKey?.trim() && !hasSearchHotspotKey(input.hotspotKeys)) {
    throw sonarqubeValidationError("Either 'projectKey' or 'hotspotKeys' must be provided");
  }
};

export let validateManageHotspotInput = (input: ManageHotspotInput) => {
  if (input.status === 'REVIEWED' && !input.resolution) {
    throw sonarqubeValidationError(
      'Resolution is required when status is REVIEWED. Valid resolutions: FIXED, SAFE, ACKNOWLEDGED'
    );
  }

  if (input.status === 'TO_REVIEW' && input.resolution) {
    throw sonarqubeValidationError(
      'Resolution should not be provided when status is TO_REVIEW'
    );
  }
};

export let searchHotspotsTool = readOnlyTool({
  name: 'Search SonarQube Security Hotspots',
  key: 'search_security_hotspots',
  description: 'Search for Security Hotspots in a project.'
})
  .input(
    z.object({
      projectKey: z
        .string()
        .optional()
        .describe(
          'The key of the project or application to search in. Required unless hotspotKeys is provided.'
        ),
      hotspotKeys: z
        .array(z.string())
        .optional()
        .describe(
          'Comma-separated list of specific Security Hotspot keys to retrieve. Required unless projectKey is provided.'
        ),
      files: z
        .array(z.string())
        .optional()
        .describe('An optional list of file paths to filter Security Hotspots'),
      status: hotspotStatusSchema.optional().describe('Filter by review status'),
      resolution: hotspotResolutionSchema
        .optional()
        .describe('Filter by resolution (when status is REVIEWED)'),
      onlyMine: z
        .boolean()
        .optional()
        .describe('If true, only Security Hotspots assigned to the current user are returned'),
      sinceLeakPeriod: z
        .boolean()
        .optional()
        .describe(
          'If true, only Security Hotspots created since the leak period (new code period) are returned'
        ),
      ...branchPullRequestInputs,
      p: z.number().optional().describe('An optional page number. Defaults to 1.'),
      ps: z
        .number()
        .optional()
        .describe(
          'An optional page size. Must be greater than 0 and less than or equal to 500. Defaults to 100.'
        )
    })
  )
  .output(
    z.object({
      hotspots: z
        .array(
          z.object({
            key: z.string().describe('Unique Security Hotspot identifier'),
            component: z
              .string()
              .describe('Component (file) where the Security Hotspot is located'),
            project: z.string().describe('Project key where the Security Hotspot was found'),
            securityCategory: z
              .string()
              .describe('Security category (e.g., sql-injection, xss, weak-cryptography)'),
            vulnerabilityProbability: z
              .string()
              .describe('Vulnerability probability (HIGH, MEDIUM, LOW)'),
            status: z.string().describe('Review status (TO_REVIEW, REVIEWED)'),
            resolution: z
              .string()
              .optional()
              .describe('Resolution when status is REVIEWED (FIXED, SAFE, ACKNOWLEDGED)'),
            line: z
              .number()
              .optional()
              .describe('Line number where the Security Hotspot is located'),
            message: z.string().describe('Security Hotspot description message'),
            assignee: z
              .string()
              .optional()
              .describe('User assigned to review the Security Hotspot'),
            author: z.string().describe('Author who introduced the Security Hotspot'),
            creationDate: z.string().describe('Date when the Security Hotspot was created'),
            updateDate: z.string().describe('Date when the Security Hotspot was last updated'),
            textRange: z
              .object({
                startLine: z.number().describe('Starting line number'),
                endLine: z.number().describe('Ending line number'),
                startOffset: z.number().describe('Starting offset in the line'),
                endOffset: z.number().describe('Ending offset in the line')
              })
              .optional()
              .describe('Location of the Security Hotspot in the source file'),
            ruleKey: z
              .string()
              .optional()
              .describe('Rule key that triggered this Security Hotspot')
          })
        )
        .describe('List of Security Hotspots found in the search'),
      paging: z
        .object({
          pageIndex: z.number().describe('Current page index (1-based)'),
          pageSize: z.number().describe('Number of items per page'),
          total: z.number().describe('Total number of items across all pages')
        })
        .describe('Pagination information for the results')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey?.trim() || undefined;
    validateSearchHotspotsInput({
      projectKey,
      hotspotKeys: ctx.input.hotspotKeys,
      resolution: ctx.input.resolution
    });
    let client = createClient(ctx);
    let result = await client.searchHotspots({
      projectKey,
      hotspotKeys: ctx.input.hotspotKeys,
      files: ctx.input.files,
      status: ctx.input.status,
      resolution: ctx.input.resolution,
      onlyMine: ctx.input.onlyMine,
      sinceLeakPeriod: ctx.input.sinceLeakPeriod,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest,
      page: ctx.input.p,
      pageSize: ctx.input.ps
    });
    let optionalString = (value: unknown) =>
      typeof value === 'string' && value.length > 0 ? value : undefined;
    let requiredString = (value: unknown) => optionalString(value) ?? '';
    let optionalNumber = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    let optionalRecord = (value: unknown) =>
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : undefined;
    let textRangeFor = (value: unknown) => {
      let textRange = optionalRecord(value);
      if (!textRange) return undefined;
      let startLine = optionalNumber(textRange.startLine);
      let endLine = optionalNumber(textRange.endLine);
      let startOffset = optionalNumber(textRange.startOffset);
      let endOffset = optionalNumber(textRange.endOffset);

      return startLine !== undefined &&
        endLine !== undefined &&
        startOffset !== undefined &&
        endOffset !== undefined
        ? {
            startLine,
            endLine,
            startOffset,
            endOffset
          }
        : undefined;
    };
    let hotspots = result.items.map(hotspot => ({
      key: requiredString(hotspot.key),
      component: requiredString(hotspot.component),
      project: requiredString(hotspot.project),
      securityCategory: requiredString(hotspot.securityCategory),
      vulnerabilityProbability: requiredString(hotspot.vulnerabilityProbability),
      status: requiredString(hotspot.status),
      resolution: optionalString(hotspot.resolution),
      line: optionalNumber(hotspot.line),
      message: requiredString(hotspot.message),
      assignee: optionalString(hotspot.assignee),
      author: requiredString(hotspot.author),
      creationDate: requiredString(hotspot.creationDate),
      updateDate: requiredString(hotspot.updateDate),
      textRange: textRangeFor(hotspot.textRange),
      ruleKey: optionalString(hotspot.ruleKey)
    }));
    let paging = {
      pageIndex: result.page?.page ?? ctx.input.p ?? 1,
      pageSize: result.page?.pageSize ?? ctx.input.ps ?? 100,
      total: result.page?.total ?? hotspots.length
    };
    let target = projectKey ? ` for project **${projectKey}**` : '';

    return {
      output: {
        hotspots,
        paging
      },
      message: `Found **${hotspots.length}** SonarQube security hotspots${target}.`
    };
  })
  .build();

export let getHotspotTool = readOnlyTool({
  name: 'Show SonarQube Security Hotspot Details',
  key: 'show_security_hotspot',
  description:
    'Get detailed information about a specific Security Hotspot, including rule details, code context, flows, and comments.'
})
  .input(
    z.object({
      hotspotKey: z.string().describe('The key of the Security Hotspot to retrieve')
    })
  )
  .output(
    z.object({
      key: z.string().describe('Unique Security Hotspot identifier'),
      component: z.string().describe('Component (file) where the Security Hotspot is located'),
      project: z.string().describe('Project key where the Security Hotspot was found'),
      securityCategory: z
        .string()
        .describe('Security category (e.g., sql-injection, xss, weak-cryptography)'),
      vulnerabilityProbability: z
        .string()
        .describe('Vulnerability probability (HIGH, MEDIUM, LOW)'),
      status: z.string().describe('Review status (TO_REVIEW, REVIEWED)'),
      resolution: z
        .string()
        .optional()
        .describe('Resolution when status is REVIEWED (FIXED, SAFE, ACKNOWLEDGED)'),
      line: z
        .number()
        .optional()
        .describe('Line number where the Security Hotspot is located'),
      message: z.string().describe('Security Hotspot description message'),
      assignee: z.string().optional().describe('User assigned to review the Security Hotspot'),
      author: z.string().optional().describe('Author who introduced the Security Hotspot'),
      creationDate: z.string().describe('Date when the Security Hotspot was created'),
      updateDate: z.string().describe('Date when the Security Hotspot was last updated'),
      textRange: z
        .object({
          startLine: z.number().describe('Starting line number'),
          endLine: z.number().describe('Ending line number'),
          startOffset: z.number().describe('Starting offset in the line'),
          endOffset: z.number().describe('Ending offset in the line')
        })
        .optional()
        .describe('Location of the Security Hotspot in the source file'),
      flows: z
        .array(
          z.object({
            locations: z
              .array(
                z.object({
                  component: z.string().describe('Component where the location is'),
                  textRange: z
                    .object({
                      startLine: z.number().describe('Starting line number'),
                      endLine: z.number().describe('Ending line number'),
                      startOffset: z.number().describe('Starting offset in the line'),
                      endOffset: z.number().describe('Ending offset in the line')
                    })
                    .describe('Text range of the location'),
                  msg: z.string().describe('Message describing the location')
                })
              )
              .describe('Locations in the flow')
          })
        )
        .describe('Code flows showing the path of the security-sensitive code'),
      comments: z
        .array(
          z.object({
            key: z.string().describe('Comment identifier'),
            login: z.string().describe('Login of the user who wrote the comment'),
            htmlText: z.string().describe('HTML-formatted comment text'),
            markdown: z.string().describe('Markdown-formatted comment text'),
            updatable: z
              .boolean()
              .describe('Whether the comment can be updated by the current user'),
            createdAt: z.string().describe('Date when the comment was created')
          })
        )
        .describe('Comments on the Security Hotspot'),
      rule: z
        .object({
          key: z.string().describe('Rule key'),
          name: z.string().describe('Rule name'),
          securityCategory: z.string().describe('Security category'),
          vulnerabilityProbability: z.string().describe('Vulnerability probability'),
          riskDescription: z.string().optional().describe('Description of the security risk'),
          vulnerabilityDescription: z
            .string()
            .optional()
            .describe('Description of potential vulnerabilities'),
          fixRecommendations: z
            .string()
            .optional()
            .describe('Recommendations for fixing the issue')
        })
        .describe('Rule that triggered the Security Hotspot'),
      canChangeStatus: z
        .boolean()
        .describe('Whether the current user can change the Security Hotspot status')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getHotspot(ctx.input.hotspotKey);
    let optionalRecord = (value: unknown) =>
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : undefined;
    let optionalString = (value: unknown) =>
      typeof value === 'string' && value.length > 0 ? value : undefined;
    let requiredString = (value: unknown) => optionalString(value) ?? '';
    let optionalNumber = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? value : undefined;
    let requiredBoolean = (value: unknown) => value === true;
    let textRangeFor = (value: unknown) => {
      let textRange = optionalRecord(value);
      if (!textRange) return undefined;
      let startLine = optionalNumber(textRange.startLine);
      let endLine = optionalNumber(textRange.endLine);
      let startOffset = optionalNumber(textRange.startOffset);
      let endOffset = optionalNumber(textRange.endOffset);

      return startLine !== undefined &&
        endLine !== undefined &&
        startOffset !== undefined &&
        endOffset !== undefined
        ? {
            startLine,
            endLine,
            startOffset,
            endOffset
          }
        : undefined;
    };
    let recordArray = (value: unknown) =>
      Array.isArray(value)
        ? value.filter(
            (item): item is Record<string, unknown> => optionalRecord(item) !== undefined
          )
        : [];
    let component = optionalRecord(data.component);
    let project = optionalRecord(data.project);
    let ruleData = optionalRecord(data.rule);
    let rule = {
      key: requiredString(ruleData?.key),
      name: requiredString(ruleData?.name),
      securityCategory: requiredString(ruleData?.securityCategory),
      vulnerabilityProbability: requiredString(ruleData?.vulnerabilityProbability),
      riskDescription: optionalString(ruleData?.riskDescription),
      vulnerabilityDescription: optionalString(ruleData?.vulnerabilityDescription),
      fixRecommendations: optionalString(ruleData?.fixRecommendations)
    };

    return {
      output: {
        key: requiredString(data.key),
        component: requiredString(component?.key),
        project: requiredString(project?.key),
        securityCategory: optionalString(data.securityCategory) ?? rule.securityCategory,
        vulnerabilityProbability:
          optionalString(data.vulnerabilityProbability) ?? rule.vulnerabilityProbability,
        status: requiredString(data.status),
        resolution: optionalString(data.resolution),
        line: optionalNumber(data.line),
        message: requiredString(data.message),
        assignee: optionalString(data.assignee),
        author: optionalString(data.author),
        creationDate: requiredString(data.creationDate),
        updateDate: requiredString(data.updateDate),
        textRange: textRangeFor(data.textRange),
        flows: recordArray(data.flows).map(flow => ({
          locations: recordArray(flow.locations).flatMap(location => {
            let textRange = textRangeFor(location.textRange);
            return textRange
              ? [
                  {
                    component: requiredString(location.component),
                    textRange,
                    msg: requiredString(location.msg)
                  }
                ]
              : [];
          })
        })),
        comments: recordArray(data.comments).map(comment => ({
          key: requiredString(comment.key),
          login: requiredString(comment.login),
          htmlText: requiredString(comment.htmlText),
          markdown: requiredString(comment.markdown),
          updatable: requiredBoolean(comment.updatable),
          createdAt: requiredString(comment.createdAt)
        })),
        rule,
        canChangeStatus: requiredBoolean(data.canChangeStatus)
      },
      message: `Retrieved SonarQube security hotspot **${ctx.input.hotspotKey}**.`
    };
  })
  .build();

export let manageHotspotTool = createSonarTool({
  name: 'Change SonarQube Security Hotspot Status',
  key: 'change_security_hotspot_status',
  description:
    'Change the status of a Security Hotspot to review it. When marking as REVIEWED, you must specify a resolution.',
  instructions: [
    'TO_REVIEW: Mark the Security Hotspot as needing review.',
    'REVIEWED: Mark the Security Hotspot as reviewed with one of these resolutions: FIXED, SAFE, or ACKNOWLEDGED.',
    'FIXED: A fix has been implemented.',
    'SAFE: Reviewed and determined to be safe.',
    'ACKNOWLEDGED: Acknowledged as a risk but accepted.',
    'You can optionally add a comment to explain your review decision.'
  ],
  readOnly: false,
  destructive: false
})
  .input(
    z.object({
      hotspotKey: z.string().describe('The key of the Security Hotspot to update'),
      status: hotspotStatusSchema.describe('The new status of the Security Hotspot'),
      resolution: hotspotResolutionSchema
        .optional()
        .describe('The resolution when status is REVIEWED. Required if status is REVIEWED'),
      comment: z
        .string()
        .optional()
        .describe('An optional comment explaining the review decision')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().describe('Success or error message'),
      hotspotKey: z.string().describe('The key of the Security Hotspot that was updated'),
      newStatus: hotspotStatusSchema.describe('The new status of the Security Hotspot'),
      newResolution: hotspotResolutionSchema
        .optional()
        .describe('The new resolution of the Security Hotspot (if status is REVIEWED)')
    })
  )
  .handleInvocation(async ctx => {
    validateManageHotspotInput(ctx.input);
    let client = createClient(ctx);
    await client.changeHotspotStatus({
      hotspotKey: ctx.input.hotspotKey,
      status: ctx.input.status,
      resolution: ctx.input.resolution,
      comment: ctx.input.comment
    });
    let message = 'The Security Hotspot status was successfully changed.';

    return {
      output: {
        success: true,
        message,
        hotspotKey: ctx.input.hotspotKey,
        newStatus: ctx.input.status,
        newResolution: ctx.input.resolution
      },
      message
    };
  })
  .build();
