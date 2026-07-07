import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import {
  branchPullRequestInputs,
  createClient,
  projectInput,
  projectKeyFromInput,
  readOnlyTool
} from './shared';

let optionalRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

let recordArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> => optionalRecord(item) !== undefined
      )
    : [];

let measureValueMap = (record: Record<string, unknown>) => {
  let values = new Map<string, string>();
  for (let measure of recordArray(record.measures)) {
    if (typeof measure.metric === 'string' && typeof measure.value === 'string') {
      values.set(measure.metric, measure.value);
    }
  }
  return values;
};

let parseFloatMeasure = (value: string | undefined) => {
  if (value === undefined || value.length === 0) return undefined;
  let parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

let parseIntegerMeasure = (value: string | undefined) => {
  if (value === undefined || value.length === 0) return undefined;
  let parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export let mapCoverageFile = (component: Record<string, unknown>) => {
  let measures = measureValueMap(component);
  let path = typeof component.path === 'string' ? component.path : undefined;
  let name = typeof component.name === 'string' ? component.name : undefined;

  return {
    key: String(component.key ?? ''),
    path: path ?? name ?? '',
    coverage: parseFloatMeasure(measures.get('coverage')),
    lineCoverage: parseFloatMeasure(measures.get('line_coverage')),
    branchCoverage: parseFloatMeasure(measures.get('branch_coverage')),
    linesToCover: parseIntegerMeasure(measures.get('lines_to_cover')),
    uncoveredLines: parseIntegerMeasure(measures.get('uncovered_lines')),
    conditionsToCover: parseIntegerMeasure(measures.get('conditions_to_cover')),
    uncoveredConditions: parseIntegerMeasure(measures.get('uncovered_conditions'))
  };
};

export let coverageProjectSummary = (projectMeasures: Record<string, unknown>) => {
  let component = optionalRecord(projectMeasures.component);
  if (!component || !Array.isArray(component.measures)) return undefined;

  let measures = measureValueMap(component);
  return {
    coverage: parseFloatMeasure(measures.get('coverage')),
    linesToCover: parseIntegerMeasure(measures.get('lines_to_cover')),
    uncoveredLines: parseIntegerMeasure(measures.get('uncovered_lines'))
  };
};

export let searchFilesByCoverageTool = readOnlyTool({
  name: 'Search SonarQube Files by Coverage',
  key: 'search_files_by_coverage',
  description:
    'Search for files in a project sorted by coverage (ascending - worst coverage first). This tool helps identify files that need test coverage improvements.'
})
  .input(
    z.object({
      ...projectInput,
      ...branchPullRequestInputs,
      maxCoverage: z
        .number()
        .optional()
        .describe('Only return files with coverage below this threshold (0-100)'),
      pageIndex: z.number().optional().describe('Page index (1-based, default: 1)'),
      pageSize: z.number().optional().describe('Page size (default: 100, max: 500)')
    })
  )
  .output(
    z.object({
      projectKey: z.string().describe('Project key'),
      totalFiles: z.number().int().describe('Total number of files in the project'),
      filesReturned: z.number().int().describe('Number of files returned in this response'),
      pageIndex: z.number().int().describe('Current page index'),
      pageSize: z.number().int().describe('Page size'),
      projectSummary: z
        .object({
          coverage: z.number().optional().describe('Overall project coverage percentage'),
          linesToCover: z
            .number()
            .int()
            .optional()
            .describe('Total lines to cover in the project'),
          uncoveredLines: z
            .number()
            .int()
            .optional()
            .describe('Total uncovered lines in the project')
        })
        .optional()
        .describe('Project-level coverage summary'),
      files: z
        .array(
          z.object({
            key: z.string().describe('File component key'),
            path: z.string().describe('File path relative to project root'),
            coverage: z
              .number()
              .optional()
              .describe('Overall coverage percentage for this file'),
            lineCoverage: z.number().optional().describe('Line coverage percentage'),
            branchCoverage: z.number().optional().describe('Branch coverage percentage'),
            linesToCover: z.number().int().optional().describe('Number of lines to cover'),
            uncoveredLines: z.number().int().optional().describe('Number of uncovered lines'),
            conditionsToCover: z
              .number()
              .int()
              .optional()
              .describe('Number of conditions (branches) to cover'),
            uncoveredConditions: z
              .number()
              .int()
              .optional()
              .describe('Number of uncovered conditions')
          })
        )
        .describe('List of files with coverage information, sorted by coverage (ascending)')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.maxCoverage !== undefined &&
      (ctx.input.maxCoverage < 0 || ctx.input.maxCoverage > 100)
    ) {
      throw sonarqubeValidationError('maxCoverage must be between 0 and 100');
    }

    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.searchFilesByCoverage({
      projectKey,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest,
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });

    let maxCoverage = ctx.input.maxCoverage;
    let files = result.items.map(mapCoverageFile).filter(file => {
      if (file.coverage === undefined) return false;
      return maxCoverage === undefined || file.coverage <= maxCoverage;
    });

    return {
      output: {
        projectKey,
        totalFiles: result.page?.total ?? result.items.length,
        filesReturned: files.length,
        pageIndex: result.pageIndex,
        pageSize: result.pageSize,
        projectSummary: coverageProjectSummary(result.projectMeasures),
        files
      },
      message: `Found **${files.length}** SonarQube files by coverage for project **${projectKey}**.`
    };
  })
  .build();

type NormalizedCoverageLine = {
  line: number;
  lineHits?: number;
  conditions?: number;
  coveredConditions?: number;
};

let optionalInteger = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : undefined;

export let normalizeCoverageLines = (data: Record<string, unknown>) =>
  recordArray(data.sources).flatMap((source): NormalizedCoverageLine[] => {
    let line = optionalInteger(source.line);
    if (line === undefined) return [];

    return [
      {
        line,
        lineHits: optionalInteger(source.lineHits),
        conditions: optionalInteger(source.conditions),
        coveredConditions: optionalInteger(source.coveredConditions)
      }
    ];
  });

let isCoverable = (line: NormalizedCoverageLine) => line.lineHits !== undefined;

let isUncovered = (line: NormalizedCoverageLine) => line.lineHits === 0;

let hasPartialBranchCoverage = (line: NormalizedCoverageLine) =>
  line.conditions !== undefined &&
  line.conditions > 0 &&
  line.coveredConditions !== undefined &&
  line.coveredConditions > 0 &&
  line.coveredConditions < line.conditions;

let hasNoBranchCoverage = (line: NormalizedCoverageLine) =>
  line.conditions !== undefined &&
  line.conditions > 0 &&
  (line.coveredConditions === undefined || line.coveredConditions === 0);

export let coverageDetailsFromLines = (lines: NormalizedCoverageLine[]) => {
  let coverableLines = lines.filter(isCoverable);
  let coveredLines = coverableLines.filter(line => !isUncovered(line)).length;
  let uncoveredLinesCount = coverableLines.length - coveredLines;
  let lineCoveragePercent =
    coverableLines.length === 0 ? 100 : (coveredLines * 100) / coverableLines.length;

  let totalConditions = lines.reduce((sum, line) => sum + (line.conditions ?? 0), 0);
  let coveredConditions = lines.reduce((sum, line) => sum + (line.coveredConditions ?? 0), 0);
  let uncoveredConditions = totalConditions - coveredConditions;
  let branchCoveragePercent =
    totalConditions === 0 ? 100 : (coveredConditions * 100) / totalConditions;

  return {
    summary: {
      totalLines: lines.length,
      coverableLines: coverableLines.length,
      coveredLines,
      uncoveredLines: uncoveredLinesCount,
      lineCoveragePercent,
      totalConditions,
      coveredConditions,
      uncoveredConditions,
      branchCoveragePercent
    },
    uncoveredLines: lines.filter(isUncovered).map(line => ({ lineNumber: line.line })),
    partiallyConditionalLines: lines
      .filter(line => hasPartialBranchCoverage(line) || hasNoBranchCoverage(line))
      .map(line => {
        let total = line.conditions ?? 0;
        let covered = line.coveredConditions ?? 0;

        return {
          lineNumber: line.line,
          totalConditions: total,
          coveredConditions: covered,
          uncoveredConditions: total - covered
        };
      })
  };
};

export let getFileCoverageDetailsTool = readOnlyTool({
  name: 'Get SonarQube File Coverage Details',
  key: 'get_file_coverage_details',
  description:
    'Get complete line-by-line coverage information for a file, including which exact lines are uncovered and which have partially covered branches. This tool helps identify precisely where to add test coverage. Use after identifying files with low coverage via search_files_by_coverage.'
})
  .input(
    z.object({
      key: z.string().describe('File key (e.g. my_project:src/foo/Bar.java)'),
      ...branchPullRequestInputs
    })
  )
  .output(
    z.object({
      fileKey: z.string().describe('File component key'),
      filePath: z.string().optional().describe('File path'),
      summary: z
        .object({
          totalLines: z.number().int().describe('Total number of lines in the file'),
          coverableLines: z
            .number()
            .int()
            .describe('Number of coverable lines (executable code)'),
          coveredLines: z.number().int().describe('Number of lines covered by tests'),
          uncoveredLines: z.number().int().describe('Number of lines not covered by tests'),
          lineCoveragePercent: z.number().describe('Line coverage percentage'),
          totalConditions: z
            .number()
            .int()
            .describe('Total number of conditions (branches) to cover'),
          coveredConditions: z
            .number()
            .int()
            .describe('Number of conditions covered by tests'),
          uncoveredConditions: z
            .number()
            .int()
            .describe('Number of conditions not covered by tests'),
          branchCoveragePercent: z.number().describe('Branch coverage percentage')
        })
        .describe('Coverage summary for this file'),
      uncoveredLines: z
        .array(
          z.object({
            lineNumber: z.number().int().describe('Line number (1-based)')
          })
        )
        .describe('List of uncovered lines (lines that have never been executed by tests)'),
      partiallyConditionalLines: z
        .array(
          z.object({
            lineNumber: z.number().int().describe('Line number (1-based)'),
            totalConditions: z
              .number()
              .int()
              .describe('Total number of conditions (branches) on this line'),
            coveredConditions: z
              .number()
              .int()
              .describe('Number of conditions covered by tests'),
            uncoveredConditions: z
              .number()
              .int()
              .describe('Number of conditions not covered by tests')
          })
        )
        .describe('List of lines with partially covered branches/conditions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getSourceLines({
      key: ctx.input.key,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest
    });
    let details = coverageDetailsFromLines(normalizeCoverageLines(data));
    let separatorIndex = ctx.input.key.indexOf(':');
    let filePath = separatorIndex >= 0 ? ctx.input.key.slice(separatorIndex + 1) : undefined;

    return {
      output: {
        fileKey: ctx.input.key,
        filePath,
        ...details
      },
      message: `Retrieved SonarQube coverage details for **${ctx.input.key}**.`
    };
  })
  .build();
