import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let fileCountsSchema = z.object({
  inProgress: z.number(),
  completed: z.number(),
  failed: z.number(),
  cancelled: z.number(),
  total: z.number()
});

let vectorStoreOutputSchema = z.object({
  vectorStoreId: z.string().describe('Vector store identifier'),
  name: z.string().nullable().describe('Name of the vector store'),
  description: z.string().nullable().optional().describe('Description of the vector store'),
  status: z.string().describe('Current status of the vector store'),
  usageBytes: z.number().optional().describe('Bytes used by the vector store'),
  fileCounts: fileCountsSchema.describe('File processing counts'),
  createdAt: z.number().describe('Unix timestamp when created')
});

let vectorStoreFileOutputSchema = z.object({
  vectorStoreFileId: z.string().describe('Vector store file identifier'),
  fileId: z.string().describe('OpenAI file identifier'),
  vectorStoreId: z.string().describe('Vector store identifier'),
  status: z.string().describe('Processing status'),
  usageBytes: z.number().optional().describe('Bytes used by the vector store file'),
  createdAt: z.number().describe('Unix timestamp when attached'),
  lastError: z.any().nullable().describe('Last processing error, if any')
});

let vectorStoreFileContentItemSchema = z.object({
  type: z.string().optional().describe('Content item type'),
  text: z.string().optional().describe('Text content')
});

let mapVectorStore = (vs: any) => ({
  vectorStoreId: vs.id,
  name: vs.name ?? null,
  description: vs.description ?? null,
  status: vs.status,
  usageBytes: vs.usage_bytes ?? vs.bytes,
  fileCounts: {
    inProgress: vs.file_counts?.in_progress ?? 0,
    completed: vs.file_counts?.completed ?? 0,
    failed: vs.file_counts?.failed ?? 0,
    cancelled: vs.file_counts?.cancelled ?? 0,
    total: vs.file_counts?.total ?? 0
  },
  createdAt: vs.created_at
});

let mapVectorStoreFile = (file: any, vectorStoreId: string) => {
  let fileId = file.file_id ?? file.id;

  return {
    vectorStoreFileId: file.id ?? fileId,
    fileId,
    vectorStoreId,
    status: file.status,
    usageBytes: file.usage_bytes,
    createdAt: file.created_at,
    lastError: file.last_error ?? null
  };
};

export let createVectorStore = SlateTool.create(spec, {
  name: 'Create Vector Store',
  key: 'create_vector_store',
  description: `Create a managed vector store for uploading, chunking, and searching files. Vector stores power file search in the Responses API and support hybrid search (semantic + keyword).`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Name for the vector store'),
      description: z.string().optional().describe('Description for the vector store'),
      fileIds: z
        .array(z.string())
        .optional()
        .describe('File IDs to add to the store on creation'),
      expiresAfterDays: z
        .number()
        .optional()
        .describe('Number of days after last activity before the store expires'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata to attach to the vector store')
    })
  )
  .output(vectorStoreOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createVectorStore({
      name: ctx.input.name,
      description: ctx.input.description,
      fileIds: ctx.input.fileIds,
      expiresAfter: ctx.input.expiresAfterDays
        ? { anchor: 'last_active_at', days: ctx.input.expiresAfterDays }
        : undefined,
      metadata: ctx.input.metadata
    });

    return {
      output: mapVectorStore(result),
      message: `Created vector store **${result.id}**${result.name ? ` ("${result.name}")` : ''}.`
    };
  })
  .build();

export let listVectorStores = SlateTool.create(spec, {
  name: 'List Vector Stores',
  key: 'list_vector_stores',
  description: `List all vector stores in your OpenAI project. Returns store metadata, file counts, and status information.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of stores to return (default 20)'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by creation time'),
      after: z.string().optional().describe('Cursor for pagination'),
      before: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      vectorStores: z.array(vectorStoreOutputSchema).describe('List of vector stores')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listVectorStores({
      limit: ctx.input.limit,
      order: ctx.input.order,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let vectorStores = (result.data ?? []).map(mapVectorStore);

    return {
      output: { vectorStores },
      message: `Found **${vectorStores.length}** vector store(s).`
    };
  })
  .build();

export let getVectorStore = SlateTool.create(spec, {
  name: 'Get Vector Store',
  key: 'get_vector_store',
  description:
    'Retrieve details for a specific OpenAI vector store, including processing status and file counts.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      vectorStoreId: z.string().describe('Vector store ID to retrieve')
    })
  )
  .output(vectorStoreOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getVectorStore(ctx.input.vectorStoreId);

    return {
      output: mapVectorStore(result),
      message: `Vector store **${result.id}** status: ${result.status}.`
    };
  })
  .build();

export let updateVectorStore = SlateTool.create(spec, {
  name: 'Update Vector Store',
  key: 'update_vector_store',
  description: 'Update a vector store name, expiration policy, or metadata.',
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      vectorStoreId: z.string().describe('Vector store ID to update'),
      name: z.string().optional().describe('New vector store name'),
      expiresAfterDays: z
        .number()
        .optional()
        .describe('Number of days after last activity before the store expires'),
      metadata: z.record(z.string(), z.string()).optional().describe('Metadata to attach')
    })
  )
  .output(vectorStoreOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.updateVectorStore(ctx.input.vectorStoreId, {
      name: ctx.input.name,
      expiresAfter: ctx.input.expiresAfterDays
        ? { anchor: 'last_active_at', days: ctx.input.expiresAfterDays }
        : undefined,
      metadata: ctx.input.metadata
    });

    return {
      output: mapVectorStore(result),
      message: `Updated vector store **${result.id}**.`
    };
  })
  .build();

export let searchVectorStore = SlateTool.create(spec, {
  name: 'Search Vector Store',
  key: 'search_vector_store',
  description: `Search a vector store using natural language queries. Returns ranked results with relevance scores. Supports configurable result limits and score thresholds.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      vectorStoreId: z.string().describe('Vector store ID to search'),
      query: z.string().describe('Natural language search query'),
      maxResults: z.number().optional().describe('Maximum number of results to return'),
      scoreThreshold: z
        .number()
        .optional()
        .describe('Minimum relevance score threshold (0-1)'),
      ranker: z.string().optional().describe('Ranking algorithm to use'),
      filters: z.any().optional().describe('Metadata filters for narrowing results')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            fileId: z.string().describe('File ID the result comes from'),
            filename: z.string().describe('File name'),
            score: z.number().describe('Relevance score'),
            content: z
              .array(
                z.object({
                  type: z.string().describe('Content type'),
                  text: z.string().optional().describe('Text content')
                })
              )
              .describe('Matched content chunks')
          })
        )
        .describe('Search results ranked by relevance')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let rankingOptions: any;
    if (ctx.input.scoreThreshold !== undefined || ctx.input.ranker !== undefined) {
      rankingOptions = {};
      if (ctx.input.ranker !== undefined) rankingOptions.ranker = ctx.input.ranker;
      if (ctx.input.scoreThreshold !== undefined)
        rankingOptions.score_threshold = ctx.input.scoreThreshold;
    }

    let result = await client.searchVectorStore(ctx.input.vectorStoreId, {
      query: ctx.input.query,
      maxResults: ctx.input.maxResults,
      filters: ctx.input.filters,
      rankingOptions
    });

    let results = (result.data ?? []).map((r: any) => ({
      fileId: r.file_id,
      filename: r.filename,
      score: r.score,
      content: (r.content ?? []).map((c: any) => ({
        type: c.type,
        text: c.text
      }))
    }));

    return {
      output: { results },
      message: `Found **${results.length}** result(s) for query "${ctx.input.query}".`
    };
  })
  .build();

export let deleteVectorStore = SlateTool.create(spec, {
  name: 'Delete Vector Store',
  key: 'delete_vector_store',
  description: `Delete a vector store by its ID. This permanently removes the store and its indexed data.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      vectorStoreId: z.string().describe('Vector store ID to delete')
    })
  )
  .output(
    z.object({
      vectorStoreId: z.string().describe('ID of the deleted vector store'),
      deleted: z.boolean().describe('Whether the store was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.deleteVectorStore(ctx.input.vectorStoreId);

    return {
      output: {
        vectorStoreId: result.id,
        deleted: result.deleted
      },
      message: `Deleted vector store **${result.id}**.`
    };
  })
  .build();

export let addVectorStoreFile = SlateTool.create(spec, {
  name: 'Add Vector Store File',
  key: 'add_vector_store_file',
  description:
    'Attach an uploaded OpenAI file to a vector store so it can be indexed for file search.',
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      vectorStoreId: z.string().describe('Vector store ID'),
      fileId: z.string().describe('Uploaded OpenAI file ID to attach'),
      attributes: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Attributes used for metadata filtering'),
      chunkingStrategy: z.any().optional().describe('Optional chunking strategy')
    })
  )
  .output(vectorStoreFileOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.addFileToVectorStore(ctx.input.vectorStoreId, {
      fileId: ctx.input.fileId,
      attributes: ctx.input.attributes,
      chunkingStrategy: ctx.input.chunkingStrategy
    });

    return {
      output: mapVectorStoreFile(result, ctx.input.vectorStoreId),
      message: `Attached file **${ctx.input.fileId}** to vector store **${ctx.input.vectorStoreId}**.`
    };
  })
  .build();

export let listVectorStoreFiles = SlateTool.create(spec, {
  name: 'List Vector Store Files',
  key: 'list_vector_store_files',
  description:
    'List files attached to a vector store, optionally filtered by processing status.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      vectorStoreId: z.string().describe('Vector store ID'),
      limit: z.number().optional().describe('Maximum number of files to return'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by creation time'),
      after: z.string().optional().describe('Cursor for pagination'),
      before: z.string().optional().describe('Cursor for pagination'),
      filter: z
        .enum(['in_progress', 'completed', 'failed', 'cancelled'])
        .optional()
        .describe('Filter by file processing status')
    })
  )
  .output(
    z.object({
      files: z.array(vectorStoreFileOutputSchema).describe('Vector store files')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listVectorStoreFiles(ctx.input.vectorStoreId, {
      limit: ctx.input.limit,
      order: ctx.input.order,
      after: ctx.input.after,
      before: ctx.input.before,
      filter: ctx.input.filter
    });
    let files = (result.data ?? []).map((file: any) =>
      mapVectorStoreFile(file, ctx.input.vectorStoreId)
    );

    return {
      output: { files },
      message: `Found **${files.length}** vector store file(s).`
    };
  })
  .build();

export let getVectorStoreFile = SlateTool.create(spec, {
  name: 'Get Vector Store File',
  key: 'get_vector_store_file',
  description: 'Retrieve status and metadata for one file attached to a vector store.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      vectorStoreId: z.string().describe('Vector store ID'),
      fileId: z.string().describe('OpenAI file ID attached to the vector store')
    })
  )
  .output(vectorStoreFileOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getVectorStoreFile(ctx.input.vectorStoreId, ctx.input.fileId);

    return {
      output: mapVectorStoreFile(result, ctx.input.vectorStoreId),
      message: `Vector store file **${ctx.input.fileId}** status: ${result.status}.`
    };
  })
  .build();

export let getVectorStoreFileContent = SlateTool.create(spec, {
  name: 'Get Vector Store File Content',
  key: 'get_vector_store_file_content',
  description: 'Retrieve parsed content chunks for a file attached to a vector store.',
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      vectorStoreId: z.string().describe('Vector store ID'),
      fileId: z.string().describe('OpenAI file ID attached to the vector store')
    })
  )
  .output(
    z.object({
      content: z
        .array(vectorStoreFileContentItemSchema)
        .describe('Content chunks extracted from the vector store file')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getVectorStoreFileContent(
      ctx.input.vectorStoreId,
      ctx.input.fileId
    );
    let rawContent = Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : result?.content
          ? [result.content]
          : [];
    let content = rawContent.map((item: any) => ({
      type: item.type,
      text: item.text
    }));

    return {
      output: { content },
      message: `Retrieved **${content.length}** content chunk(s) for file **${ctx.input.fileId}**.`
    };
  })
  .build();

export let removeVectorStoreFile = SlateTool.create(spec, {
  name: 'Remove Vector Store File',
  key: 'remove_vector_store_file',
  description:
    'Detach a file from a vector store. This removes it from the vector store index but does not delete the uploaded file.',
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      vectorStoreId: z.string().describe('Vector store ID'),
      fileId: z.string().describe('OpenAI file ID to detach')
    })
  )
  .output(
    z.object({
      fileId: z.string().describe('Detached file ID'),
      deleted: z.boolean().describe('Whether the file was detached')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.removeFileFromVectorStore(
      ctx.input.vectorStoreId,
      ctx.input.fileId
    );

    return {
      output: {
        fileId: result.id,
        deleted: result.deleted
      },
      message: `Removed file **${result.id}** from vector store **${ctx.input.vectorStoreId}**.`
    };
  })
  .build();
