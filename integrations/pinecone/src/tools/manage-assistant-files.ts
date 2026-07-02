import { SlateTool } from 'slates';
import { z } from 'zod';
import { PineconeAssistantClient, PineconeControlPlaneClient } from '../lib/client';
import { pineconeServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageAssistantFilesTool = SlateTool.create(spec, {
  name: 'Manage Assistant Files',
  key: 'manage_assistant_files',
  description: `List, upload, upsert, describe, or delete files in a Pinecone Assistant, and inspect asynchronous assistant file operations.`,
  instructions: [
    'Upload and delete are asynchronous; the output includes an operation ID that can be polled with describe_operation.',
    'Use upload to let Pinecone generate a file ID. Use upsert when you need a stable file ID.',
    'Use list_operations or describe_operation to check processing status.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'upload',
          'upsert',
          'describe',
          'delete',
          'list_operations',
          'describe_operation'
        ])
        .describe('Assistant file action to perform'),
      assistantName: z.string().describe('Name of the assistant'),
      fileId: z
        .string()
        .optional()
        .describe('Assistant file ID. Required for upsert, describe, and delete.'),
      fileName: z
        .string()
        .optional()
        .describe('Filename for upload or upsert, including extension'),
      fileBase64: z
        .string()
        .optional()
        .describe('Base64-encoded file content for upload or upsert'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type for upload or upsert, such as text/plain or application/pdf'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('File metadata for upload/upsert or filter for list'),
      multimodal: z
        .boolean()
        .optional()
        .describe('Whether to enable multimodal PDF processing during upload/upsert'),
      includeUrl: z
        .boolean()
        .optional()
        .describe('Include a signed file URL when describing a file'),
      limit: z.number().int().min(1).optional().describe('Maximum files to list'),
      paginationToken: z.string().optional().describe('Token for the next list page'),
      operationId: z
        .string()
        .optional()
        .describe('Operation ID, required for describe_operation'),
      operationStatus: z
        .string()
        .optional()
        .describe('Optional status filter for list_operations'),
      operationType: z
        .string()
        .optional()
        .describe('Optional operation type filter for list_operations')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            fileId: z.string().describe('Assistant file ID'),
            name: z.string().optional().describe('File name'),
            size: z.number().optional().describe('File size in bytes'),
            status: z.string().optional().describe('File processing status'),
            metadata: z
              .record(z.string(), z.any())
              .nullable()
              .optional()
              .describe('File metadata'),
            createdOn: z.string().optional().describe('Creation timestamp'),
            updatedOn: z.string().optional().describe('Last update timestamp'),
            signedUrl: z.string().optional().describe('Signed URL when requested'),
            multimodal: z
              .boolean()
              .optional()
              .describe('Whether multimodal processing is enabled')
          })
        )
        .optional()
        .describe('Assistant files returned by list or describe'),
      operations: z
        .array(
          z.object({
            operationId: z.string().describe('Operation ID'),
            operationType: z.string().optional().describe('Operation type'),
            fileId: z.string().optional().describe('Related file ID'),
            status: z.string().optional().describe('Operation status'),
            createdOn: z.string().optional().describe('Creation timestamp'),
            percentComplete: z.number().optional().describe('Completion percentage'),
            errorMessage: z.string().optional().describe('Failure message when present')
          })
        )
        .optional()
        .describe(
          'Assistant operations returned by upload/delete/list/describe operation actions'
        ),
      nextPaginationToken: z.string().optional().describe('Token for the next list page'),
      deleted: z.boolean().optional().describe('Whether a delete was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let controlClient = new PineconeControlPlaneClient({ token: ctx.auth.token });
    let assistant = await controlClient.describeAssistant(ctx.input.assistantName);
    let assistantHost = assistant.host || `https://prod-1-data.ke.pinecone.io`;
    let assistantClient = new PineconeAssistantClient({
      token: ctx.auth.token,
      assistantHost
    });

    let toFileOutput = (file: {
      id: string;
      name?: string;
      size?: number;
      status?: string;
      metadata?: Record<string, any> | null;
      created_on?: string;
      updated_on?: string;
      signed_url?: string;
      multimodal?: boolean;
    }) => ({
      fileId: file.id,
      name: file.name,
      size: file.size,
      status: file.status,
      metadata: file.metadata,
      createdOn: file.created_on,
      updatedOn: file.updated_on,
      signedUrl: file.signed_url,
      multimodal: file.multimodal
    });

    let toOperationOutput = (operation: {
      id: string;
      operation_type?: string;
      file_id?: string;
      status?: string;
      created_on?: string;
      percent_complete?: number;
      error_message?: string;
    }) => ({
      operationId: operation.id,
      operationType: operation.operation_type,
      fileId: operation.file_id,
      status: operation.status,
      createdOn: operation.created_on,
      percentComplete: operation.percent_complete,
      errorMessage: operation.error_message
    });

    if (ctx.input.action === 'list') {
      let result = await assistantClient.listFiles(ctx.input.assistantName, {
        filter: ctx.input.metadata,
        limit: ctx.input.limit,
        paginationToken: ctx.input.paginationToken
      });
      let files = (result.files || []).map(toFileOutput);
      return {
        output: {
          files,
          nextPaginationToken: result.pagination?.next
        },
        message: `Found **${files.length}** file${files.length === 1 ? '' : 's'} in assistant \`${ctx.input.assistantName}\`.`
      };
    }

    if (ctx.input.action === 'upload' || ctx.input.action === 'upsert') {
      if (!ctx.input.fileName || !ctx.input.fileBase64) {
        throw pineconeServiceError(
          'fileName and fileBase64 are required for upload and upsert.'
        );
      }
      if (ctx.input.action === 'upsert' && !ctx.input.fileId) {
        throw pineconeServiceError('fileId is required for upsert.');
      }

      let operation = await assistantClient.uploadFile(ctx.input.assistantName, {
        fileId: ctx.input.action === 'upsert' ? ctx.input.fileId : undefined,
        fileName: ctx.input.fileName,
        fileBase64: ctx.input.fileBase64,
        mimeType: ctx.input.mimeType,
        metadata: ctx.input.metadata,
        multimodal: ctx.input.multimodal
      });

      return {
        output: {
          operations: [toOperationOutput(operation)]
        },
        message: `${ctx.input.action === 'upload' ? 'Uploaded' : 'Upserted'} file \`${ctx.input.fileName}\`; operation \`${operation.id}\` is ${operation.status || 'accepted'}.`
      };
    }

    if (ctx.input.action === 'describe') {
      if (!ctx.input.fileId) {
        throw pineconeServiceError('fileId is required for describe.');
      }
      let file = await assistantClient.describeFile(
        ctx.input.assistantName,
        ctx.input.fileId,
        {
          includeUrl: ctx.input.includeUrl
        }
      );
      return {
        output: {
          files: [toFileOutput(file)]
        },
        message: `File \`${file.id}\` is ${file.status || 'available'}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.fileId) {
        throw pineconeServiceError('fileId is required for delete.');
      }
      let operation = await assistantClient.deleteFile(
        ctx.input.assistantName,
        ctx.input.fileId
      );
      return {
        output: {
          deleted: true,
          operations: [toOperationOutput(operation)]
        },
        message: `Delete accepted for file \`${ctx.input.fileId}\`; operation \`${operation.id}\` is ${operation.status || 'accepted'}.`
      };
    }

    if (ctx.input.action === 'list_operations') {
      let result = await assistantClient.listOperations(ctx.input.assistantName, {
        status: ctx.input.operationStatus,
        operationType: ctx.input.operationType
      });
      let operations = (result.operations || []).map(toOperationOutput);
      return {
        output: { operations },
        message: `Found **${operations.length}** assistant operation${operations.length === 1 ? '' : 's'}.`
      };
    }

    if (!ctx.input.operationId) {
      throw pineconeServiceError('operationId is required for describe_operation.');
    }
    let operation = await assistantClient.describeOperation(
      ctx.input.assistantName,
      ctx.input.operationId
    );
    return {
      output: {
        operations: [toOperationOutput(operation)]
      },
      message: `Operation \`${operation.id}\` is ${operation.status || 'available'}.`
    };
  })
  .build();
