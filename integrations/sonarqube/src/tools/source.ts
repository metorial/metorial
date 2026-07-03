import { createTextAttachment } from 'slates';
import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import { createClient, rawRecordSchema, readOnlyTool, scmLineSchema } from './shared';

let lineRangeInputs = {
  fromLine: z.number().optional().describe('First 1-based source line to include.'),
  toLine: z.number().optional().describe('Last 1-based source line to include.')
};

let cloudBranchPullRequestInputs = {
  branch: z
    .string()
    .optional()
    .describe(
      'Branch key to query. Documented for SonarQube Cloud source/duplication reads only; do not combine with pullRequest.'
    ),
  pullRequest: z
    .string()
    .optional()
    .describe(
      'Pull request id/key to query. Documented for SonarQube Cloud source/duplication reads only; do not combine with branch.'
    )
};

export let validateLineRange = (input: { fromLine?: number; toLine?: number }) => {
  for (let [label, value] of [
    ['fromLine', input.fromLine],
    ['toLine', input.toLine]
  ] as const) {
    if (
      value !== undefined &&
      (!Number.isFinite(value) || !Number.isInteger(value) || value < 1)
    ) {
      throw sonarqubeValidationError(`${label} must be a positive integer.`);
    }
  }

  if (
    input.fromLine !== undefined &&
    input.toLine !== undefined &&
    Math.floor(input.toLine) < Math.floor(input.fromLine)
  ) {
    throw sonarqubeValidationError('toLine must be greater than or equal to fromLine.');
  }
};

let optionalNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

let optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

type NormalizedSourceLine = {
  line: number | undefined;
  code: string;
  raw: unknown;
};

export let sourceLinesFromShowResponse = (data: Record<string, unknown>) => {
  if (!Array.isArray(data.sources)) return [];

  let lines: NormalizedSourceLine[] = [];
  for (let item of data.sources) {
    if (Array.isArray(item)) {
      lines.push({
        line: optionalNumber(item[0]),
        code: optionalString(item[1]) ?? '',
        raw: item
      });
      continue;
    }

    if (typeof item === 'object' && item !== null) {
      let record = item as Record<string, unknown>;
      lines.push({
        line: optionalNumber(record.line),
        code: optionalString(record.code) ?? '',
        raw: record
      });
    }
  }

  return lines;
};

export let sourceTextFromShowResponse = (data: Record<string, unknown>) =>
  sourceLinesFromShowResponse(data)
    .map(line => line.code)
    .join('\n');

let sourceLinesFromRawText = (content: string) =>
  content.length === 0 ? [] : content.split(/\r\n|\n|\r/);

export let sourceTextFromRawResponse = (
  content: string,
  input: { fromLine?: number; toLine?: number } = {}
) => {
  validateLineRange(input);

  let lines = sourceLinesFromRawText(content);
  let start = input.fromLine === undefined ? 0 : input.fromLine - 1;
  let end = input.toLine ?? lines.length;

  return lines.slice(start, end).join('\n');
};

let sourceLineCount = (content: string) => sourceLinesFromRawText(content).length;

export let sourceAttachmentMetadata = (content: string) => ({
  mimeType: 'text/plain',
  byteLength: Buffer.byteLength(content, 'utf8'),
  attachmentCount: 1
});

export let duplicationFilesFromShowResponse = (data: Record<string, unknown>) =>
  typeof data.files === 'object' && data.files !== null && !Array.isArray(data.files)
    ? (data.files as Record<string, unknown>)
    : {};

let mapScmEntry = (entry: unknown) => {
  if (Array.isArray(entry)) {
    return {
      line: optionalNumber(entry[0]),
      author: optionalString(entry[1]),
      date: optionalString(entry[2]),
      revision: optionalString(entry[3]),
      raw: entry
    };
  }

  if (typeof entry === 'object' && entry !== null) {
    let record = entry as Record<string, unknown>;
    return {
      line: optionalNumber(record.line),
      author: optionalString(record.author),
      date: optionalString(record.date),
      revision: optionalString(record.revision),
      raw: record
    };
  }

  return {
    raw: entry
  };
};

export let getSourceTool = readOnlyTool({
  name: 'Get Source',
  key: 'get_source',
  description:
    'Retrieve source code for a SonarQube file component key. Use list_component_tree with FIL qualifiers to discover file keys. Source text is returned as a Slate text attachment, not inline output.'
})
  .input(
    z.object({
      component: z
        .string()
        .describe(
          'Exact file component key to retrieve source for, usually discovered with list_component_tree using qualifier FIL.'
        ),
      ...cloudBranchPullRequestInputs,
      ...lineRangeInputs
    })
  )
  .output(
    z.object({
      component: z.string().describe('Component key used for the request.'),
      branch: z.string().optional().describe('Branch key used for the request.'),
      pullRequest: z.string().optional().describe('Pull request id/key used for the request.'),
      fromLine: z.number().optional().describe('First source line included.'),
      toLine: z.number().optional().describe('Last source line included.'),
      lineCount: z.number().optional().describe('Number of source lines in the attachment.'),
      mimeType: z.string().describe('Attachment MIME type.'),
      byteLength: z.number().describe('Attachment byte length.'),
      attachmentCount: z.number().describe('Number of Slate attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    validateLineRange(ctx.input);
    let client = createClient(ctx);
    let hasRange = ctx.input.fromLine !== undefined || ctx.input.toLine !== undefined;
    let rawContent = await client.getSourceRaw({
      component: ctx.input.component,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest
    });
    let content = hasRange ? sourceTextFromRawResponse(rawContent, ctx.input) : rawContent;
    let lineCount = sourceLineCount(content);

    let metadata = sourceAttachmentMetadata(content);

    return {
      output: {
        component: ctx.input.component,
        branch: ctx.input.branch,
        pullRequest: ctx.input.pullRequest,
        fromLine: ctx.input.fromLine,
        toLine: ctx.input.toLine,
        lineCount,
        ...metadata
      },
      attachments: [createTextAttachment(content, metadata.mimeType)],
      message: `Retrieved SonarQube source for **${ctx.input.component}** as a text attachment.`
    };
  })
  .build();

export let getScmInfoTool = readOnlyTool({
  name: 'Get SCM Info',
  key: 'get_scm_info',
  description:
    'Get SonarQube SCM blame information for a file component key, optionally scoped to a line range. Use list_component_tree with FIL qualifiers to discover file keys.'
})
  .input(
    z.object({
      component: z
        .string()
        .describe(
          'Exact file component key to retrieve SCM info for, usually discovered with list_component_tree using qualifier FIL.'
        ),
      commitsByLine: z
        .boolean()
        .optional()
        .describe('Whether SonarQube should return commits grouped by line when supported.'),
      ...lineRangeInputs
    })
  )
  .output(
    z.object({
      component: z.string().describe('Component key used for the request.'),
      entries: z.array(scmLineSchema).describe('SCM line entries returned by SonarQube.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    validateLineRange(ctx.input);
    let client = createClient(ctx);
    let data = await client.getScmInfo(ctx.input);
    let entries = Array.isArray(data.scm) ? data.scm.map(mapScmEntry) : [];

    return {
      output: {
        component: ctx.input.component,
        entries,
        raw: data
      },
      message: `Retrieved **${entries.length}** SCM entries for SonarQube component **${ctx.input.component}**.`
    };
  })
  .build();

export let getDuplicationsTool = readOnlyTool({
  name: 'Get Duplications',
  key: 'get_duplications',
  description:
    'Get SonarQube duplication blocks and related files for a component key. Use list_component_tree with FIL qualifiers for source files; branch and pullRequest are Cloud-only here.'
})
  .input(
    z.object({
      component: z
        .string()
        .describe(
          'Exact component key to retrieve duplications for, usually a file component discovered with list_component_tree.'
        ),
      ...cloudBranchPullRequestInputs
    })
  )
  .output(
    z.object({
      component: z.string().describe('Component key used for the request.'),
      duplications: z.array(z.any()).describe('Duplication blocks returned by SonarQube.'),
      files: rawRecordSchema.describe('Related duplicated files keyed by duplication _ref.'),
      fileCount: z.number().describe('Number of related duplicated files returned.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getDuplications(ctx.input);
    let duplications = Array.isArray(data.duplications) ? data.duplications : [];
    let files = duplicationFilesFromShowResponse(data);
    let fileCount = Object.keys(files).length;

    return {
      output: {
        component: ctx.input.component,
        duplications,
        files,
        fileCount,
        raw: data
      },
      message: `Retrieved **${duplications.length}** duplication block(s) for SonarQube component **${ctx.input.component}**.`
    };
  })
  .build();
