import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import { createClient, projectInput, projectKeyFromInput, readOnlyTool } from './shared';

let textRangeSchema = z.object({
  startLine: z.number().int().describe('Starting line number (1-based)'),
  endLine: z.number().int().describe('Ending line number (1-based)')
});

let analysisLocationSchema = z.object({
  textRange: textRangeSchema.optional().describe('Text range of this location'),
  message: z.string().optional().describe('Message explaining this location in the flow'),
  file: z.string().optional().describe('File path for this location')
});

let analysisFlowSchema = z.object({
  type: z.string().optional().describe('The type of flow: UNDEFINED, DATA, or EXECUTION'),
  description: z.string().optional().describe('Description of the flow, if any'),
  locations: z
    .array(analysisLocationSchema)
    .optional()
    .describe('List of locations in this flow')
});

let advancedIssueSchema = z.object({
  id: z.string().describe('Unique identifier of the issue'),
  filePath: z
    .string()
    .optional()
    .describe('Project-relative path of the file containing the issue'),
  message: z.string().describe('Primary message of the issue'),
  rule: z.string().describe('The rule key (e.g., java:S1854)'),
  textRange: textRangeSchema.optional().describe('Location of the issue in the source file'),
  flows: z
    .array(analysisFlowSchema)
    .optional()
    .describe('Secondary locations and flows for the issue')
});

let requireString = (value: unknown, field: string) => {
  if (typeof value === 'string') return value;
  throw sonarqubeValidationError(
    `SonarQube advanced analysis response did not include ${field}.`
  );
};

let optionalRecord = (value: unknown) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

export let resolveWorkspaceFilePath = (
  filePath: string,
  workspaceRoot: string = process.cwd()
) => {
  let trimmed = filePath.trim();
  if (!trimmed) {
    throw sonarqubeValidationError('filePath is required.');
  }
  if (path.isAbsolute(trimmed)) {
    throw sonarqubeValidationError('filePath must be relative to the current workspace.');
  }

  let root = path.resolve(workspaceRoot);
  let absolute = path.resolve(root, trimmed);
  let relative = path.relative(root, absolute);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw sonarqubeValidationError('filePath must stay within the current workspace.');
  }

  return absolute;
};

export let readWorkspaceFileContent = async (
  filePath: string,
  workspaceRoot: string = process.cwd()
) => {
  let absolute = resolveWorkspaceFilePath(filePath, workspaceRoot);
  try {
    return await readFile(absolute, 'utf8');
  } catch (error) {
    let code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw sonarqubeValidationError(
        `filePath '${filePath}' does not exist within the current workspace.`
      );
    }
    throw sonarqubeValidationError(
      `Unable to read filePath '${filePath}' from the current workspace.`
    );
  }
};

export let resolveAdvancedAnalysisFileContent = async (
  filePath: string,
  fileContent: string | undefined,
  workspaceRoot: string = process.cwd()
) => {
  resolveWorkspaceFilePath(filePath, workspaceRoot);
  return fileContent ?? (await readWorkspaceFileContent(filePath, workspaceRoot));
};

let textRangeFrom = (value: unknown) => {
  let record = optionalRecord(value);
  if (!record) return undefined;
  return {
    startLine: typeof record.startLine === 'number' ? record.startLine : 0,
    endLine: typeof record.endLine === 'number' ? record.endLine : 0
  };
};

let mapLocation = (location: unknown) => {
  let record = optionalRecord(location);
  if (!record) {
    throw sonarqubeValidationError(
      'SonarQube advanced analysis response included an invalid flow location.'
    );
  }

  return {
    textRange: textRangeFrom(record.textRange),
    message: typeof record.message === 'string' ? record.message : undefined,
    file: typeof record.file === 'string' ? record.file : undefined
  };
};

let mapFlow = (flow: unknown) => {
  let record = optionalRecord(flow);
  if (!record) {
    throw sonarqubeValidationError(
      'SonarQube advanced analysis response included an invalid flow.'
    );
  }

  let locations = Array.isArray(record.locations) ? record.locations.map(mapLocation) : [];
  let mapped = {
    type: typeof record.type === 'string' ? record.type : undefined,
    description: typeof record.description === 'string' ? record.description : undefined
  };

  return locations.length > 0 ? { ...mapped, locations } : mapped;
};

export let mapAdvancedIssue = (issue: unknown) => {
  let record = optionalRecord(issue);
  if (!record) {
    throw sonarqubeValidationError(
      'SonarQube advanced analysis response included an invalid issue.'
    );
  }

  let flows = Array.isArray(record.flows) ? record.flows.map(mapFlow) : [];
  let mapped = {
    id: requireString(record.id, 'issue id'),
    filePath: typeof record.filePath === 'string' ? record.filePath : undefined,
    message: requireString(record.message, 'issue message'),
    rule: requireString(record.rule, 'issue rule'),
    textRange: textRangeFrom(record.textRange)
  };

  return flows.length > 0 ? { ...mapped, flows } : mapped;
};

let mapAnalysisError = (error: unknown) => {
  let record = optionalRecord(error);
  if (!record) {
    throw sonarqubeValidationError(
      'SonarQube advanced analysis response included an invalid analysis error.'
    );
  }

  return {
    code: requireString(record.code, 'analysis error code'),
    message: requireString(record.message, 'analysis error message')
  };
};

export let runAdvancedCodeAnalysisTool = readOnlyTool({
  name: 'SonarQube Advanced Code Analysis',
  key: 'run_advanced_code_analysis',
  description:
    "Run advanced code analysis on a single file using SonarQube Cloud's server-side engine. Identifies code quality and security issues, leveraging the project's full analysis context for deeper cross-file detection. Provide the complete fileContent when the file is not available in the integration runtime; otherwise filePath is read from its current workspace. Always specify the file scope (MAIN or TEST) for more accurate results."
})
  .input(
    z.object({
      ...projectInput,
      branchName: z
        .string()
        .describe(
          'The branch name used to retrieve the latest analysis context from SonarQube Cloud.'
        ),
      filePath: z
        .string()
        .describe(
          "Project-relative path of the file to analyze (e.g., 'src/main/java/MyClass.java'). SonarQube uses this path to match project analysis context."
        ),
      fileContent: z
        .string()
        .optional()
        .describe(
          'Complete current file content. Provide this when the file is not available in the integration runtime; when omitted, filePath is read from its current workspace.'
        ),
      fileScope: z
        .enum(['MAIN', 'TEST'])
        .optional()
        .describe('Scope of the file: MAIN or TEST (default: MAIN).')
    })
  )
  .output(
    z.object({
      issues: z.array(advancedIssueSchema).describe('List of issues found in the analysis'),
      patchResult: z
        .object({
          newIssues: z
            .array(advancedIssueSchema)
            .describe('Issues that appear only in the patched version'),
          matchedIssues: z
            .array(advancedIssueSchema)
            .describe('Issues that exist in both original and patched versions'),
          closedIssues: z
            .array(z.string())
            .describe('Issue IDs that were closed/fixed by the patch')
        })
        .optional()
        .describe('Result of analyzing a patch, showing new, matched, and closed issues'),
      analysisErrors: z
        .array(
          z.object({
            code: z.string().describe('Error code identifying the type of failure'),
            message: z.string().describe('Human-readable description of what went wrong')
          })
        )
        .optional()
        .describe('Non-fatal errors that occurred during analysis')
    })
  )
  .handleInvocation(async ctx => {
    let organizationKey = ctx.config.organization?.trim();
    if (!organizationKey) {
      throw sonarqubeValidationError(
        'organization config is required for run_advanced_code_analysis.'
      );
    }

    if (!ctx.input.branchName.trim()) {
      throw sonarqubeValidationError('branchName is required.');
    }
    if (!ctx.input.filePath.trim()) {
      throw sonarqubeValidationError('filePath is required.');
    }
    let client = createClient(ctx);
    let fileContent = await resolveAdvancedAnalysisFileContent(
      ctx.input.filePath,
      ctx.input.fileContent
    );
    let data = await client.runAdvancedCodeAnalysis({
      organizationKey,
      projectKey: projectKeyFromInput(ctx.config, ctx.input),
      branchName: ctx.input.branchName,
      filePath: ctx.input.filePath,
      fileContent,
      fileScope: ctx.input.fileScope ?? 'MAIN'
    });

    let issues = Array.isArray(data.issues) ? data.issues.map(mapAdvancedIssue) : [];
    let patchRecord = optionalRecord(data.patchResult);
    let patchResult = patchRecord
      ? {
          newIssues: Array.isArray(patchRecord.newIssues)
            ? patchRecord.newIssues.map(mapAdvancedIssue)
            : [],
          matchedIssues: Array.isArray(patchRecord.matchedIssues)
            ? patchRecord.matchedIssues.map(mapAdvancedIssue)
            : [],
          closedIssues: Array.isArray(patchRecord.closedIssues)
            ? patchRecord.closedIssues.filter(
                (issue): issue is string => typeof issue === 'string'
              )
            : []
        }
      : undefined;
    let analysisErrors = Array.isArray(data.errors)
      ? data.errors.map(mapAnalysisError)
      : undefined;

    return {
      output: {
        issues,
        patchResult,
        analysisErrors
      },
      message: `Advanced code analysis returned **${issues.length}** issues.`
    };
  })
  .build();
