import { SlateTool } from 'slates';
import { z } from 'zod';
import { CohereClient } from '../lib/client';
import { spec } from '../spec';

let datasetOutputSchema = z.object({
  datasetId: z.string().describe('Unique identifier of the dataset'),
  name: z.string().describe('Name of the dataset'),
  datasetType: z.string().optional().describe('Type of the dataset (e.g., embed-input)'),
  validationStatus: z.string().optional().describe('Current validation status'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp of creation'),
  updatedAt: z.string().optional().describe('ISO 8601 timestamp of last update')
});

export let createDatasetTool = SlateTool.create(spec, {
  name: 'Create Dataset',
  key: 'create_dataset',
  description: `Create a Cohere hosted dataset by uploading a CSV, JSONL, or text file. Embed-input datasets can be used later with batch embed jobs.`,
  instructions: [
    'Provide exactly one of "fileContent" or "fileContentBase64" for the required data file.',
    'For batch embedding, use datasetType "embed-input" and include a text field in each row.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the uploaded dataset'),
      datasetType: z
        .string()
        .default('embed-input')
        .describe('Cohere dataset type. Use "embed-input" for Embed Jobs.'),
      fileName: z.string().describe('Name of the dataset file, such as "embed.jsonl"'),
      fileContent: z.string().optional().describe('Dataset file content as a text string'),
      fileContentBase64: z.string().optional().describe('Base64-encoded dataset file bytes'),
      mimeType: z.string().optional().describe('MIME type for the dataset file'),
      evalFileName: z.string().optional().describe('Optional evaluation dataset file name'),
      evalFileContent: z
        .string()
        .optional()
        .describe('Optional evaluation dataset file content as a text string'),
      evalFileContentBase64: z
        .string()
        .optional()
        .describe('Optional base64-encoded evaluation dataset file bytes'),
      evalMimeType: z.string().optional().describe('MIME type for the evaluation file'),
      keepOriginalFile: z
        .boolean()
        .optional()
        .describe('Whether Cohere should store the original uploaded file'),
      skipMalformedInput: z
        .boolean()
        .optional()
        .describe('Drop malformed rows instead of failing validation'),
      keepFields: z
        .array(z.string())
        .optional()
        .describe('Field names that must be preserved in the hosted dataset'),
      optionalFields: z
        .array(z.string())
        .optional()
        .describe('Field names that should be preserved when present'),
      textSeparator: z
        .string()
        .optional()
        .describe('Separator for splitting raw text uploads'),
      csvDelimiter: z.string().optional().describe('Delimiter used for CSV uploads')
    })
  )
  .output(
    z.object({
      datasetId: z.string().describe('ID of the created dataset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });
    let result = await client.createDataset({
      name: ctx.input.name,
      datasetType: ctx.input.datasetType,
      fileName: ctx.input.fileName,
      fileContent: ctx.input.fileContent,
      fileContentBase64: ctx.input.fileContentBase64,
      mimeType: ctx.input.mimeType,
      evalFileName: ctx.input.evalFileName,
      evalFileContent: ctx.input.evalFileContent,
      evalFileContentBase64: ctx.input.evalFileContentBase64,
      evalMimeType: ctx.input.evalMimeType,
      keepOriginalFile: ctx.input.keepOriginalFile,
      skipMalformedInput: ctx.input.skipMalformedInput,
      keepFields: ctx.input.keepFields,
      optionalFields: ctx.input.optionalFields,
      textSeparator: ctx.input.textSeparator,
      csvDelimiter: ctx.input.csvDelimiter
    });

    return {
      output: {
        datasetId: result.id || ''
      },
      message: `Created dataset **${result.id || ctx.input.name}**.`
    };
  })
  .build();

export let listDatasetsTool = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `List datasets stored in your Cohere account. Datasets are used for batch embedding jobs and can be filtered by type, date, and validation status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetType: z
        .string()
        .optional()
        .describe('Filter by dataset type (e.g., "embed-input")'),
      before: z
        .string()
        .optional()
        .describe('Only return datasets created before this ISO 8601 date'),
      after: z
        .string()
        .optional()
        .describe('Only return datasets created after this ISO 8601 date'),
      limit: z.number().optional().describe('Maximum number of datasets to return'),
      offset: z.number().optional().describe('Number of datasets to skip for pagination'),
      validationStatus: z
        .string()
        .optional()
        .describe('Filter by validation status (e.g., "validated")')
    })
  )
  .output(
    z.object({
      datasets: z.array(datasetOutputSchema).describe('List of datasets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.listDatasets({
      datasetType: ctx.input.datasetType,
      before: ctx.input.before,
      after: ctx.input.after,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      validationStatus: ctx.input.validationStatus
    });

    let datasets = (result.datasets || []).map((d: any) => ({
      datasetId: d.id || '',
      name: d.name || '',
      datasetType: d.dataset_type,
      validationStatus: d.validation_status,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return {
      output: { datasets },
      message: `Found **${datasets.length}** dataset(s).`
    };
  })
  .build();

export let getDatasetUsageTool = SlateTool.create(spec, {
  name: 'Get Dataset Usage',
  key: 'get_dataset_usage',
  description: `View total Cohere hosted dataset storage usage for the organization.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizationUsageBytes: z
        .number()
        .describe('Total dataset storage used by the organization')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });
    let result = await client.getDatasetUsage();

    return {
      output: {
        organizationUsageBytes: result.organization_usage ?? 0
      },
      message: `Cohere dataset storage usage is **${result.organization_usage ?? 0}** bytes.`
    };
  })
  .build();

export let getDatasetTool = SlateTool.create(spec, {
  name: 'Get Dataset',
  key: 'get_dataset',
  description: `Retrieve details about a specific dataset by its ID, including its type, validation status, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to retrieve')
    })
  )
  .output(datasetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    let result = await client.getDataset(ctx.input.datasetId);
    let d = result.dataset || result;

    return {
      output: {
        datasetId: d.id || '',
        name: d.name || '',
        datasetType: d.dataset_type,
        validationStatus: d.validation_status,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      },
      message: `Retrieved dataset **${d.name || ctx.input.datasetId}** (status: ${d.validation_status || 'unknown'}).`
    };
  })
  .build();

export let deleteDatasetTool = SlateTool.create(spec, {
  name: 'Delete Dataset',
  key: 'delete_dataset',
  description: `Delete a dataset from your Cohere account by its ID. Datasets are automatically deleted after 30 days, but this allows immediate removal.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the dataset was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CohereClient({ token: ctx.auth.token });

    await client.deleteDataset(ctx.input.datasetId);

    return {
      output: { deleted: true },
      message: `Deleted dataset **${ctx.input.datasetId}**.`
    };
  })
  .build();
