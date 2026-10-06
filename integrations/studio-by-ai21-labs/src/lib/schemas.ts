import { createApiServiceError, isApiErrorRecord } from 'slates';
import { z } from 'zod';

export const fileSchema = z.object({
  fileId: z.string().describe('Library file identifier'),
  name: z.string().describe('File name'),
  fileType: z.string().optional().describe('File format'),
  sizeBytes: z.number().optional().describe('File size in bytes'),
  labels: z.array(z.string()).optional().describe('File labels'),
  status: z.string().optional().describe('File processing status'),
  publicUrl: z.string().optional().describe('Public source URL'),
  creationDate: z.string().optional().describe('Upload timestamp'),
  lastUpdated: z.string().optional().describe('Last update timestamp'),
  path: z.string().optional().describe('File path in the library'),
  errorCode: z.number().optional().describe('Provider processing error code, if any'),
  errorMessage: z.string().optional().describe('Provider processing error message, if any')
});

export const parseResponse = <T>(schema: z.ZodType<T>, value: unknown, label: string): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(`AI21 Studio returned an invalid ${label} response.`);
  return parsed.data;
};

export const mapFile = (value: unknown) => {
  if (!isApiErrorRecord(value))
    throw createApiServiceError('AI21 Studio returned invalid file metadata.');
  const file = parseResponse(
    fileSchema,
    {
      fileId: value.fileId ?? value.file_id ?? value.id,
      name: value.name ?? value.fileName,
      fileType: value.fileType ?? value.file_type,
      sizeBytes: value.sizeBytes ?? value.size_bytes ?? value.size ?? undefined,
      labels: value.labels ?? undefined,
      status: value.status ?? undefined,
      publicUrl: value.publicUrl ?? value.public_url ?? undefined,
      creationDate: value.creationDate ?? value.creation_date ?? value.created_at,
      lastUpdated: value.lastUpdated ?? value.last_updated,
      path: value.path ?? undefined,
      errorCode: value.errorCode ?? value.error_code ?? undefined,
      errorMessage: value.errorMessage ?? value.error_message ?? undefined
    },
    'file metadata'
  );
  if (!file.fileId || !file.name)
    throw createApiServiceError('AI21 Studio returned incomplete file metadata.');
  return file;
};

export const runOutputSchema = z.object({
  runId: z.string().describe('Run identifier. Use get_maestro_run to retrieve its status.'),
  result: z
    .string()
    .optional()
    .describe('Generated output text, or serialized structured output'),
  status: z
    .string()
    .optional()
    .describe('Run status, including in_progress, completed, failed, or requires_action'),
  requirementsResult: z.any().optional().describe('Requirement validation results'),
  dataSources: z
    .array(z.any())
    .optional()
    .describe('Retrieved data sources, with sourceType for categorized responses'),
  dataSourcesByType: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Provider data sources grouped by category'),
  errorMessage: z.string().optional().describe('Provider failure details')
});

const runResponseSchema = z.object({
  id: z.string().min(1),
  status: z.string().min(1),
  result: z.unknown().optional(),
  requirements_result: z.unknown().optional(),
  data_sources: z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())]).nullish(),
  error: z.object({ message: z.string() }).nullish()
});
export const mapRun = (value: unknown) => {
  const run = parseResponse(runResponseSchema, value, 'Maestro run');
  const sources = run.data_sources;
  return {
    runId: run.id,
    status: run.status,
    result:
      run.result == null
        ? undefined
        : typeof run.result === 'string'
          ? run.result
          : JSON.stringify(run.result),
    requirementsResult: run.requirements_result ?? undefined,
    dataSources: Array.isArray(sources)
      ? sources
      : sources
        ? Object.entries(sources).flatMap(([sourceType, items]) =>
            Array.isArray(items)
              ? items.map(item =>
                  isApiErrorRecord(item)
                    ? { ...item, sourceType }
                    : { sourceType, value: item }
                )
              : []
          )
        : undefined,
    dataSourcesByType: sources && !Array.isArray(sources) ? sources : undefined,
    errorMessage: run.error?.message
  };
};

export const validateTurns = (messages: Array<{ role: string; content: string }>) => {
  if (
    !messages.length ||
    messages.some(
      (message, index) =>
        message.role !== (index % 2 === 0 ? 'user' : 'assistant') || !message.content.trim()
    )
  )
    throw createApiServiceError(
      'Provide non-empty alternating user/assistant messages, starting with a user message.'
    );
};
