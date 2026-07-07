import { createTextAttachment } from 'slates';
import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import {
  branchPullRequestInputs,
  createClient,
  projectInput,
  projectKeyFromInput,
  readOnlyTool
} from './shared';

export let sourceAttachmentMetadata = (content: string) => ({
  mimeType: 'text/plain',
  byteLength: Buffer.byteLength(content, 'utf8'),
  attachmentCount: 1
});

export let duplicationFilesFromShowResponse = (data: Record<string, unknown>) =>
  typeof data.files === 'object' && data.files !== null && !Array.isArray(data.files)
    ? (data.files as Record<string, unknown>)
    : {};

let scmInfoLineRangeInputs = {
  from: z.number().optional().describe('First line to return. Starts at 1'),
  to: z.number().optional().describe('Last line to return (inclusive)')
};

let validateScmInfoLineRange = (input: { from?: number; to?: number }) => {
  for (let [label, value] of [
    ['from', input.from],
    ['to', input.to]
  ] as const) {
    if (
      value !== undefined &&
      (!Number.isFinite(value) || !Number.isInteger(value) || value < 1)
    ) {
      throw sonarqubeValidationError(`${label} must be a positive integer.`);
    }
  }

  if (input.from !== undefined && input.to !== undefined && input.to < input.from) {
    throw sonarqubeValidationError('to must be greater than or equal to from.');
  }
};

let scmInfoLineSchema = z.object({
  lineNumber: z.number().int().describe('Line number in the file'),
  author: z.string().describe('Author who last modified this line'),
  datetime: z.string().describe('Date and time of last modification'),
  revision: z.string().describe('SCM revision/commit identifier')
});

let mapScmInfoEntry = (entry: unknown) => {
  if (!Array.isArray(entry)) {
    throw sonarqubeValidationError('SonarQube SCM response included a malformed entry.');
  }

  let [lineNumber, author, datetime, revision] = entry;
  if (
    typeof lineNumber !== 'number' ||
    !Number.isFinite(lineNumber) ||
    typeof author !== 'string' ||
    typeof datetime !== 'string' ||
    typeof revision !== 'string'
  ) {
    throw sonarqubeValidationError('SonarQube SCM response included a malformed entry.');
  }

  return {
    lineNumber: Math.trunc(lineNumber),
    author,
    datetime,
    revision
  };
};

export let getSourceTool = readOnlyTool({
  name: 'Get SonarQube Raw Source Code',
  key: 'get_raw_source',
  description:
    "Get source code as raw text. Requires 'See Source Code' permission on file. Source text is returned as a Slate text attachment, not inline output."
})
  .input(
    z.object({
      key: z.string().describe('File key (e.g. my_project:src/foo/Bar.php)'),
      ...branchPullRequestInputs
    })
  )
  .output(
    z.object({
      fileKey: z.string().describe('The file key.'),
      mimeType: z.string().describe('Attachment MIME type.'),
      byteLength: z.number().describe('Attachment byte length.'),
      attachmentCount: z.number().describe('Number of Slate attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let sourceCode = await client.getSourceRaw({
      component: ctx.input.key,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest
    });

    let metadata = sourceAttachmentMetadata(sourceCode);

    return {
      output: {
        fileKey: ctx.input.key,
        ...metadata
      },
      attachments: [createTextAttachment(sourceCode, metadata.mimeType)],
      message: `Retrieved SonarQube raw source for **${ctx.input.key}** as a text attachment.`
    };
  })
  .build();

export let getScmInfoTool = readOnlyTool({
  name: 'Get SonarQube SCM Information',
  key: 'get_scm_info',
  description:
    "Get SCM information of source files. Requires See Source Code permission on file's project"
})
  .input(
    z.object({
      key: z.string().describe('File key (e.g. my_project:src/foo/Bar.php)'),
      commits_by_line: z
        .boolean()
        .optional()
        .describe(
          'Group lines by SCM commit if value is false, else display commits for each line (true/false)'
        ),
      ...scmInfoLineRangeInputs
    })
  )
  .output(
    z.object({
      scmLines: z.array(scmInfoLineSchema).describe('SCM information for each line')
    })
  )
  .handleInvocation(async ctx => {
    validateScmInfoLineRange(ctx.input);
    let client = createClient(ctx);
    let data = await client.getScmInfo({
      component: ctx.input.key,
      commitsByLine: ctx.input.commits_by_line,
      fromLine: ctx.input.from,
      toLine: ctx.input.to
    });
    let scmLines = Array.isArray(data.scm) ? data.scm.map(mapScmInfoEntry) : [];

    return {
      output: {
        scmLines
      },
      message: `Retrieved **${scmLines.length}** SonarQube SCM lines for **${ctx.input.key}**.`
    };
  })
  .build();

let duplicatedFileSchema = z.object({
  key: z.string().describe('SonarQube file component key.'),
  name: z.string().describe('File display name.'),
  path: z.string().optional().describe('File path.'),
  duplicatedLines: z.number().int().optional().describe('Number of duplicated lines.'),
  duplicatedBlocks: z.number().int().optional().describe('Number of duplicated blocks.'),
  duplicatedLinesDensity: z.string().optional().describe('Duplication density percentage.')
});

let duplicatedFilesPagingSchema = z.object({
  pageIndex: z.number().int().describe('Current page number.'),
  pageSize: z.number().int().describe('Number of results per page.'),
  total: z.number().int().describe('Total number of duplicated files.')
});

let duplicationSummarySchema = z.object({
  totalDuplicatedLines: z
    .number()
    .int()
    .optional()
    .describe('Total duplicated lines in the project.'),
  totalDuplicatedBlocks: z
    .number()
    .int()
    .optional()
    .describe('Total duplicated blocks in the project.'),
  overallDuplicationDensity: z
    .string()
    .optional()
    .describe('Overall duplication density percentage.')
});

export let searchDuplicatedFilesTool = readOnlyTool({
  name: 'Search SonarQube Files With Duplications',
  key: 'search_duplicated_files',
  description:
    'Search for files with code duplications in a project. By default, automatically fetches all duplicated files across all pages (up to 10,000 files max).'
})
  .input(
    z.object({
      ...projectInput,
      ...branchPullRequestInputs,
      pageIndex: z
        .number()
        .optional()
        .describe(
          'Optional: Page number for manual pagination (starts at 1). If not specified, auto-fetches all duplicated files.'
        ),
      pageSize: z
        .number()
        .optional()
        .describe(
          'Optional: Number of results per page for manual pagination (max: 500). If not specified, auto-fetches all duplicated files.'
        )
    })
  )
  .output(
    z.object({
      files: z
        .array(duplicatedFileSchema)
        .describe('List of files with duplications, sorted by most duplicated first.'),
      paging: duplicatedFilesPagingSchema.describe('Pagination information.'),
      summary: duplicationSummarySchema.optional().describe('Summary of duplication metrics.')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.pageSize !== undefined &&
      (!Number.isFinite(ctx.input.pageSize) ||
        !Number.isInteger(ctx.input.pageSize) ||
        ctx.input.pageSize <= 0 ||
        ctx.input.pageSize > 500)
    ) {
      throw sonarqubeValidationError('Page size must be between 1 and 500');
    }
    if (
      ctx.input.pageIndex !== undefined &&
      (!Number.isFinite(ctx.input.pageIndex) ||
        !Number.isInteger(ctx.input.pageIndex) ||
        ctx.input.pageIndex <= 0)
    ) {
      throw sonarqubeValidationError('Page index must be greater than 0');
    }

    let projectKey = projectKeyFromInput(ctx.config, ctx.input);
    let client = createClient(ctx);
    let result = await client.searchDuplicatedFiles({
      projectKey,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest,
      pageIndex: ctx.input.pageIndex,
      pageSize: ctx.input.pageSize
    });
    if (
      !result.page ||
      result.page.page === undefined ||
      result.page.pageSize === undefined ||
      result.page.total === undefined
    ) {
      throw sonarqubeValidationError(
        'SonarQube duplicated files response did not include paging.'
      );
    }
    let files = result.items.map(file => {
      if (file.name === undefined) {
        throw sonarqubeValidationError(
          'SonarQube duplicated file response did not include file name.'
        );
      }

      return {
        key: file.key,
        name: file.name,
        path: file.path,
        duplicatedLines: file.duplicatedLines,
        duplicatedBlocks: file.duplicatedBlocks,
        duplicatedLinesDensity: file.duplicatedLinesDensity
      };
    });
    let summary = result.summary
      ? {
          totalDuplicatedLines: result.summary.duplicatedLines,
          totalDuplicatedBlocks: result.summary.duplicatedBlocks,
          overallDuplicationDensity: result.summary.duplicatedLinesDensity
        }
      : undefined;

    return {
      output: {
        files,
        paging: {
          pageIndex: result.page.page,
          pageSize: result.page.pageSize,
          total: result.page.total
        },
        summary
      },
      message: `Found **${files.length}** duplicated SonarQube files for project **${projectKey}**.`
    };
  })
  .build();

export let getDuplicationsTool = readOnlyTool({
  name: 'Get SonarQube Code Duplications',
  key: 'get_duplications',
  description: "Get duplications for a file. Requires Browse permission on file's project"
})
  .input(
    z.object({
      key: z.string().describe('File key (e.g. my_project:src/foo/Bar.php)'),
      ...branchPullRequestInputs
    })
  )
  .output(
    z.object({
      duplications: z
        .array(
          z.object({
            blocks: z
              .array(
                z.object({
                  from: z.number().int().describe('Starting line number'),
                  size: z.number().int().describe('Number of lines'),
                  fileName: z.string().describe('File name'),
                  fileKey: z.string().describe('File key')
                })
              )
              .describe('List of code blocks involved in this duplication')
          })
        )
        .describe('List of duplication groups found'),
      files: z
        .array(
          z.object({
            key: z.string().describe('File key'),
            name: z.string().describe('File name')
          })
        )
        .describe('Map of file references to file information')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getDuplications({
      component: ctx.input.key,
      branch: ctx.input.branch,
      pullRequest: ctx.input.pullRequest
    });

    if (!Array.isArray(data.duplications)) {
      throw sonarqubeValidationError(
        'SonarQube duplications response did not include duplications.'
      );
    }

    if (typeof data.files !== 'object' || data.files === null || Array.isArray(data.files)) {
      throw sonarqubeValidationError('SonarQube duplications response did not include files.');
    }

    let files = duplicationFilesFromShowResponse(data);
    let stringValue = (value: unknown) => (typeof value === 'string' ? value : '');
    let integerValue = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : 0;
    let fileInfoForReference = (reference: unknown) => {
      if (typeof reference !== 'string') return undefined;

      let fileInfo = files[reference];
      return typeof fileInfo === 'object' && fileInfo !== null && !Array.isArray(fileInfo)
        ? (fileInfo as Record<string, unknown>)
        : undefined;
    };

    let duplications = data.duplications.map(duplication => {
      if (
        typeof duplication !== 'object' ||
        duplication === null ||
        Array.isArray(duplication)
      ) {
        throw sonarqubeValidationError(
          'SonarQube duplications response included a malformed duplication.'
        );
      }

      let blocksInput = (duplication as Record<string, unknown>).blocks;
      if (!Array.isArray(blocksInput)) {
        throw sonarqubeValidationError(
          'SonarQube duplications response included a malformed duplication block list.'
        );
      }

      let blocks = blocksInput.map(block => {
        if (typeof block !== 'object' || block === null || Array.isArray(block)) {
          throw sonarqubeValidationError(
            'SonarQube duplications response included a malformed block.'
          );
        }

        let record = block as Record<string, unknown>;
        let fileInfo = fileInfoForReference(record._ref);

        return {
          from: integerValue(record.from),
          size: integerValue(record.size),
          fileName: stringValue(fileInfo?.name),
          fileKey: stringValue(fileInfo?.key)
        };
      });

      return { blocks };
    });

    let fileList = Object.values(files).map(fileInfo => {
      if (typeof fileInfo !== 'object' || fileInfo === null || Array.isArray(fileInfo)) {
        throw sonarqubeValidationError(
          'SonarQube duplications response included malformed file information.'
        );
      }

      return {
        key: stringValue((fileInfo as Record<string, unknown>).key),
        name: stringValue((fileInfo as Record<string, unknown>).name)
      };
    });

    return {
      output: {
        duplications,
        files: fileList
      },
      message: `Retrieved **${duplications.length}** duplication group(s) for SonarQube file **${ctx.input.key}**.`
    };
  })
  .build();
