import { createApiServiceError, pickDefined } from 'slates';
import { z } from 'zod';

export const identifier = z.record(z.string(), z.unknown());
export const struct = z.record(
  z.string(),
  z.union([
    z.string().min(1),
    z.object({
      description: z.string().min(1).describe('What the research should extract.'),
      type: z
        .string()
        .optional()
        .describe('Provider type expression, such as str, int or list[str].')
    })
  ])
);
export const tier = z.enum(['micro', 'low', 'medium', 'high']);
export const jobInput = z.object({
  task_id: z
    .string()
    .trim()
    .min(1)
    .describe('Job ID returned by the corresponding start tool.')
});
export const startOutput = z.object({
  task_id: z.string().min(1).describe('Job ID to pass to the corresponding status tool.'),
  status: z.string().describe('Initial job status reported by Sixtyfour.'),
  row_count: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional()
    .describe('Number of submitted records.'),
  estimated_cost_credits: z
    .number()
    .nonnegative()
    .nullable()
    .optional()
    .describe('Estimated minimum credit cost.'),
  unrecognized_fields: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Fields the provider ignored.')
});
export const fileOutput = z.object({
  filename: z.string().describe('Name of the downloadable result file.'),
  block_number: z
    .number()
    .nullable()
    .optional()
    .describe('Pipeline stage; the highest stage is the final output.')
});
export const jobOutput = z.object({
  task_id: z.string().describe('Job ID.'),
  status: z.string().describe('Current job status, normalized to lowercase.'),
  task_type: z.string().nullable().optional().describe('Type of research or contact lookup.'),
  result: z
    .unknown()
    .optional()
    .describe('Completed single-record or contact lookup results.'),
  charge_credits: z
    .number()
    .nullable()
    .optional()
    .describe('Credits charged by the provider.'),
  progress: z
    .object({
      completed: z.number().nonnegative().describe('Rows enriched so far.'),
      total: z.number().nonnegative().describe('Total submitted rows.')
    })
    .optional()
    .describe('Completed and total rows for a running bulk job.'),
  results_url: z
    .string()
    .optional()
    .describe('Link to the completed run in the Sixtyfour app.'),
  files: z.array(fileOutput).optional().describe('Downloadable bulk result files.'),
  error: z.unknown().optional().describe('Provider-reported job failure details.')
});
const downloadSchema = z.object({
  filename: z.string().min(1),
  block_number: z.number().nullable().optional(),
  download_url: z.string().url()
});
export type BulkFile = z.infer<typeof downloadSchema>;

export const requireNonempty = (value: Record<string, unknown>, label: string) => {
  if (!Object.keys(value).length)
    throw createApiServiceError(`Provide at least one field in ${label}.`);
};
export const validateResearch = (value: Record<string, unknown>, depth?: string) => {
  requireNonempty(value, 'struct');
  if (depth === 'micro' && Object.keys(value).length > 10)
    throw createApiServiceError('The micro tier supports at most 10 output fields.');
};
export const parseStart = (value: unknown) => {
  const parsed = startOutput.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'Sixtyfour did not return a valid job ID and status. The submission may have succeeded; do not blindly resubmit.'
    );
  return parsed.data;
};
export const parseBulkFiles = (value: unknown): BulkFile[] => {
  if (value === undefined || value === null) return [];
  const parsed = z.array(downloadSchema).safeParse(value);
  if (!parsed.success)
    throw createApiServiceError('Sixtyfour returned invalid bulk result file metadata.');
  for (const file of parsed.data) {
    const url = new URL(file.download_url);
    if (url.origin !== 'https://api.sixtyfour.ai' || url.username || url.password)
      throw createApiServiceError(
        'Sixtyfour returned an unsupported authenticated download URL.'
      );
  }
  return parsed.data;
};
export const fileMimeType = (filename: string) =>
  filename.endsWith('.csv')
    ? 'text/csv'
    : filename.endsWith('.ndjson') || filename.endsWith('.jsonl')
      ? 'application/x-ndjson'
      : filename.endsWith('.json')
        ? 'application/json'
        : 'application/octet-stream';
export const downloadRefreshAt = () => new Date(Date.now() + 13 * 60 * 1000).toISOString();
export const parseJob = (data: Record<string, unknown>, taskId: string, files: BulkFile[]) => {
  const parsed = jobOutput.safeParse(
    pickDefined({
      task_id: taskId,
      status: typeof data.status === 'string' ? data.status.toLowerCase() : data.status,
      task_type: data.task_type,
      result: data.result,
      charge_credits: data.charge_credits,
      progress: data.progress,
      results_url: data.results_url,
      files: files.length
        ? files.map(file =>
            pickDefined({ filename: file.filename, block_number: file.block_number })
          )
        : undefined,
      error: data.error
    })
  );
  if (!parsed.success)
    throw createApiServiceError('Sixtyfour returned invalid job status metadata.');
  return parsed.data;
};
export const bulkForm = (
  rows: Record<string, unknown>[] | undefined,
  csvText: string | undefined,
  config: Record<string, unknown>
) => {
  if ((rows !== undefined) === (csvText !== undefined))
    throw createApiServiceError('Provide exactly one of rows or csv_text.');
  rows?.forEach(row => requireNonempty(row, 'each row'));
  const contents = rows === undefined ? (csvText ?? '') : JSON.stringify(rows);
  const configText = JSON.stringify(pickDefined(config));
  if (Buffer.byteLength(contents, 'utf8') > 100 * 1024 * 1024)
    throw createApiServiceError('The input file must not exceed 100 MB.');
  if (configText.length > 300000)
    throw createApiServiceError(
      'The bulk research configuration must not exceed 300,000 characters.'
    );
  const form = new FormData();
  form.append(
    'file',
    new Blob([contents], { type: rows === undefined ? 'text/csv' : 'application/json' }),
    rows === undefined ? 'records.csv' : 'records.json'
  );
  form.append('config', configText);
  return form;
};
