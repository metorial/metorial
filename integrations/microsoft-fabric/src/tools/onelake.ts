import { createBase64Attachment, SlateTool } from '@slates/provider';
import { z } from 'zod';
import { fabricValidationError } from '../lib/errors';
import {
  resolveItemReference,
  resolveWorkspaceReference,
  validateOptionalOneLakePath
} from '../lib/paths';
import { spec } from '../spec';
import { createOneLakeClient } from './common';

let workspaceReferenceSchema = {
  workspaceId: z
    .string()
    .optional()
    .describe('Fabric workspace ID. Provide workspaceId or workspace.'),
  workspace: z
    .string()
    .optional()
    .describe('Fabric workspace friendly name or ID. Provide workspaceId or workspace.')
};

let itemReferenceSchema = {
  itemId: z.string().optional().describe('Fabric item ID. Provide itemId or item.'),
  item: z
    .string()
    .optional()
    .describe(
      'Fabric item friendly identifier or ID. Friendly identifiers should include the item type suffix where Microsoft supports it, such as MyLakehouse.Lakehouse.'
    )
};

let workspaceAndItemSchema = {
  ...workspaceReferenceSchema,
  ...itemReferenceSchema
};

let itemsOutputSchema = z.object({
  items: z.array(z.unknown()).describe('Items returned by OneLake.'),
  continuationToken: z.string().optional().describe('Continuation token for the next page.')
});

let operationStatusOutputSchema = z.object({
  workspace: z.string().describe('Resolved workspace reference.'),
  item: z.string().describe('Resolved item reference.'),
  path: z.string().describe('OneLake path affected by the operation.'),
  status: z.number().describe('HTTP status returned by OneLake.')
});

let resolveNamespace = (input: { namespace?: string; schema?: string }) => {
  let namespace = input.namespace?.trim();
  let schema = input.schema?.trim();

  if (namespace && schema && namespace !== schema) {
    throw fabricValidationError(
      'namespace and schema refer to the same value and cannot differ.'
    );
  }

  let value = namespace || schema;
  if (!value) {
    throw fabricValidationError('Provide namespace or schema.');
  }

  return value;
};

let contentBufferFromInput = (input: { contentText?: string; contentBase64?: string }) => {
  let hasText = input.contentText !== undefined;
  let hasBase64 = input.contentBase64 !== undefined;

  if (hasText === hasBase64) {
    throw fabricValidationError('Provide exactly one of contentText or contentBase64.');
  }

  if (input.contentText !== undefined) {
    return Buffer.from(input.contentText, 'utf8');
  }

  return Buffer.from(input.contentBase64 ?? '', 'base64');
};

export let onelakeListWorkspaces = SlateTool.create(spec, {
  name: 'OneLake List Workspaces',
  key: 'onelake_list_workspaces',
  description:
    'Official upstream MCP name: onelake_list_workspaces. List OneLake workspaces visible to the connected Microsoft Fabric user.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      continuationToken: z
        .string()
        .optional()
        .describe('Continuation token from a previous page.'),
      format: z
        .enum(['json', 'raw'])
        .optional()
        .describe('Response detail preference. json returns normalized workspace data.')
    })
  )
  .output(
    z.object({
      workspaces: z.array(z.unknown()).describe('Workspaces returned by OneLake.'),
      continuationToken: z
        .string()
        .optional()
        .describe('Continuation token for the next page.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await createOneLakeClient(ctx).listWorkspaces({
      continuationToken: ctx.input.continuationToken
    });

    return {
      output: {
        workspaces: ctx.input.format === 'raw' ? [result.raw] : result.workspaces,
        continuationToken: result.continuationToken
      },
      message: `Returned **${result.workspaces.length}** OneLake workspace(s).`
    };
  })
  .build();

export let onelakeListItems = SlateTool.create(spec, {
  name: 'OneLake List Items',
  key: 'onelake_list_items',
  description:
    'Official upstream MCP name: onelake_list_items. List OneLake items for a Fabric workspace using the OneLake API endpoint.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...workspaceReferenceSchema,
      continuationToken: z
        .string()
        .optional()
        .describe('Continuation token from a previous page.')
    })
  )
  .output(itemsOutputSchema)
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let result = await createOneLakeClient(ctx).listItems({
      workspace,
      continuationToken: ctx.input.continuationToken
    });

    return {
      output: {
        items: result.items,
        continuationToken: result.continuationToken
      },
      message: `Returned **${result.items.length}** OneLake item(s) for workspace **${workspace}**.`
    };
  })
  .build();

export let onelakeListItemsDfs = SlateTool.create(spec, {
  name: 'OneLake List Items DFS',
  key: 'onelake_list_items_dfs',
  description:
    'Official upstream MCP name: onelake_list_items_dfs. List workspace paths through the OneLake DFS-compatible endpoint.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...workspaceReferenceSchema,
      recursive: z.boolean().optional().describe('Whether to recursively list paths.')
    })
  )
  .output(
    z.object({
      workspace: z.string().describe('Resolved workspace reference.'),
      paths: z.array(z.unknown()).describe('DFS paths returned by OneLake.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let result = await createOneLakeClient(ctx).listItemsDfs({
      workspace,
      recursive: ctx.input.recursive
    });

    return {
      output: {
        workspace,
        paths: result.paths
      },
      message: `Returned **${result.paths.length}** DFS path(s) for workspace **${workspace}**.`
    };
  })
  .build();

export let onelakeListFiles = SlateTool.create(spec, {
  name: 'OneLake List Files',
  key: 'onelake_list_files',
  description:
    'Official upstream MCP name: onelake_list_files. List files under a Fabric item through the OneLake DFS-compatible endpoint.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...workspaceAndItemSchema,
      path: z.string().optional().describe('Optional relative path inside the item.'),
      recursive: z.boolean().optional().describe('Whether to recursively list files.'),
      format: z
        .enum(['json', 'raw'])
        .optional()
        .describe('Response detail preference. json returns normalized file data.')
    })
  )
  .output(
    z.object({
      workspace: z.string().describe('Resolved workspace reference.'),
      item: z.string().describe('Resolved item reference.'),
      path: z.string().optional().describe('Relative path listed.'),
      files: z.array(z.unknown()).describe('Files returned by OneLake.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let path = validateOptionalOneLakePath(ctx.input.path);
    let result = await createOneLakeClient(ctx).listFiles({
      workspace,
      item,
      path,
      recursive: ctx.input.recursive
    });

    return {
      output: {
        workspace,
        item,
        path,
        files: ctx.input.format === 'raw' ? [result.raw] : result.files
      },
      message: `Returned **${result.files.length}** OneLake file path(s).`
    };
  })
  .build();

export let onelakeDownloadFile = SlateTool.create(spec, {
  name: 'OneLake Download File',
  key: 'onelake_download_file',
  description:
    'Official upstream MCP name: onelake_download_file. Download a OneLake file and return the file content as an attachment.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...workspaceAndItemSchema,
      filePath: z.string().describe('Relative file path inside the item.')
    })
  )
  .output(
    z.object({
      workspace: z.string().describe('Resolved workspace reference.'),
      item: z.string().describe('Resolved item reference.'),
      filePath: z.string().describe('Downloaded file path.'),
      contentType: z.string().describe('MIME type returned by OneLake.'),
      size: z.number().describe('Downloaded file size in bytes.'),
      attachmentCount: z.number().describe('Number of attachments returned.'),
      etag: z.string().optional().describe('OneLake file ETag.'),
      lastModified: z.string().optional().describe('OneLake last modified time.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let result = await createOneLakeClient(ctx).downloadFile({
      workspace,
      item,
      filePath: ctx.input.filePath
    });

    return {
      output: {
        workspace,
        item,
        filePath: ctx.input.filePath,
        contentType: result.contentType,
        size: result.size,
        attachmentCount: 1,
        etag: result.etag,
        lastModified: result.lastModified
      },
      attachments: [createBase64Attachment(result.base64, result.contentType)],
      message: `Downloaded **${ctx.input.filePath}** from OneLake as an attachment.`
    };
  })
  .build();

export let onelakeUploadFile = SlateTool.create(spec, {
  name: 'OneLake Upload File',
  key: 'onelake_upload_file',
  description:
    'Official upstream MCP name: onelake_upload_file. Upload inline text or base64 content into a OneLake file.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      ...workspaceAndItemSchema,
      filePath: z.string().describe('Relative destination file path inside the item.'),
      contentText: z
        .string()
        .optional()
        .describe(
          'UTF-8 text content to upload. Provide exactly one of contentText or contentBase64.'
        ),
      contentBase64: z
        .string()
        .optional()
        .describe(
          'Base64-encoded binary content to upload. Provide exactly one of contentText or contentBase64.'
        ),
      contentType: z.string().optional().describe('MIME type to send with the uploaded file.'),
      overwrite: z
        .boolean()
        .optional()
        .describe('Whether to overwrite an existing file. Defaults to true.')
    })
  )
  .output(
    operationStatusOutputSchema.extend({
      size: z.number().describe('Uploaded content size in bytes.'),
      etag: z.string().optional().describe('Uploaded file ETag.'),
      lastModified: z.string().optional().describe('Uploaded file last modified time.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let content = contentBufferFromInput(ctx.input);
    let result = await createOneLakeClient(ctx).uploadFile({
      workspace,
      item,
      filePath: ctx.input.filePath,
      content,
      contentType: ctx.input.contentType,
      overwrite: ctx.input.overwrite ?? true
    });

    return {
      output: {
        workspace,
        item,
        path: ctx.input.filePath,
        status: result.status,
        size: result.size,
        etag: result.etag,
        lastModified: result.lastModified
      },
      message: `Uploaded **${ctx.input.filePath}** to OneLake (${result.size} bytes).`
    };
  })
  .build();

export let onelakeDeleteFile = SlateTool.create(spec, {
  name: 'OneLake Delete File',
  key: 'onelake_delete_file',
  description: 'Official upstream MCP name: onelake_delete_file. Delete a file from OneLake.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      ...workspaceAndItemSchema,
      filePath: z.string().describe('Relative file path inside the item.')
    })
  )
  .output(operationStatusOutputSchema)
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let result = await createOneLakeClient(ctx).deleteFile({
      workspace,
      item,
      filePath: ctx.input.filePath
    });

    return {
      output: {
        workspace,
        item,
        path: ctx.input.filePath,
        status: result.status
      },
      message: `Deleted OneLake file **${ctx.input.filePath}**.`
    };
  })
  .build();

export let onelakeCreateDirectory = SlateTool.create(spec, {
  name: 'OneLake Create Directory',
  key: 'onelake_create_directory',
  description:
    'Official upstream MCP name: onelake_create_directory. Create a directory in OneLake.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      ...workspaceAndItemSchema,
      directoryPath: z.string().describe('Relative directory path inside the item.')
    })
  )
  .output(
    operationStatusOutputSchema.extend({
      etag: z.string().optional().describe('Directory ETag.'),
      lastModified: z.string().optional().describe('Directory last modified time.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let result = await createOneLakeClient(ctx).createDirectory({
      workspace,
      item,
      directoryPath: ctx.input.directoryPath
    });

    return {
      output: {
        workspace,
        item,
        path: ctx.input.directoryPath,
        status: result.status,
        etag: result.etag,
        lastModified: result.lastModified
      },
      message: `Created OneLake directory **${ctx.input.directoryPath}**.`
    };
  })
  .build();

export let onelakeDeleteDirectory = SlateTool.create(spec, {
  name: 'OneLake Delete Directory',
  key: 'onelake_delete_directory',
  description:
    'Official upstream MCP name: onelake_delete_directory. Delete a directory from OneLake.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      ...workspaceAndItemSchema,
      directoryPath: z.string().describe('Relative directory path inside the item.'),
      recursive: z.boolean().optional().describe('Delete recursively. Defaults to true.')
    })
  )
  .output(operationStatusOutputSchema)
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let result = await createOneLakeClient(ctx).deleteDirectory({
      workspace,
      item,
      directoryPath: ctx.input.directoryPath,
      recursive: ctx.input.recursive
    });

    return {
      output: {
        workspace,
        item,
        path: ctx.input.directoryPath,
        status: result.status
      },
      message: `Deleted OneLake directory **${ctx.input.directoryPath}**.`
    };
  })
  .build();

export let onelakeGetTableConfig = SlateTool.create(spec, {
  name: 'OneLake Get Table Config',
  key: 'onelake_get_table_config',
  description:
    'Official upstream MCP name: onelake_get_table_config. Get OneLake Iceberg table REST catalog configuration for a Fabric item.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object(workspaceAndItemSchema))
  .output(
    z.object({
      workspace: z.string().describe('Resolved workspace reference.'),
      item: z.string().describe('Resolved item reference.'),
      config: z.unknown().describe('OneLake table configuration response.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let config = await createOneLakeClient(ctx).getTableConfig({ workspace, item });

    return {
      output: { workspace, item, config },
      message: `Returned OneLake table config for **${item}**.`
    };
  })
  .build();

export let onelakeListTableNamespaces = SlateTool.create(spec, {
  name: 'OneLake List Table Namespaces',
  key: 'onelake_list_table_namespaces',
  description:
    'Official upstream MCP name: onelake_list_table_namespaces. List Iceberg table namespaces for a Fabric item.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object(workspaceAndItemSchema))
  .output(
    z.object({
      workspace: z.string().describe('Resolved workspace reference.'),
      item: z.string().describe('Resolved item reference.'),
      namespaces: z.unknown().describe('OneLake namespaces response.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let namespaces = await createOneLakeClient(ctx).listTableNamespaces({ workspace, item });

    return {
      output: { workspace, item, namespaces },
      message: `Returned table namespaces for **${item}**.`
    };
  })
  .build();

export let onelakeGetTableNamespace = SlateTool.create(spec, {
  name: 'OneLake Get Table Namespace',
  key: 'onelake_get_table_namespace',
  description:
    'Official upstream MCP name: onelake_get_table_namespace. Get metadata for a OneLake Iceberg table namespace.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...workspaceAndItemSchema,
      namespace: z.string().optional().describe('Namespace name. Alias: schema.'),
      schema: z.string().optional().describe('Schema name alias for namespace.')
    })
  )
  .output(
    z.object({
      workspace: z.string().describe('Resolved workspace reference.'),
      item: z.string().describe('Resolved item reference.'),
      namespace: z.string().describe('Resolved namespace.'),
      metadata: z.unknown().describe('OneLake namespace response.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let namespace = resolveNamespace(ctx.input);
    let metadata = await createOneLakeClient(ctx).getTableNamespace({
      workspace,
      item,
      namespace
    });

    return {
      output: { workspace, item, namespace, metadata },
      message: `Returned table namespace **${namespace}** for **${item}**.`
    };
  })
  .build();

export let onelakeListTables = SlateTool.create(spec, {
  name: 'OneLake List Tables',
  key: 'onelake_list_tables',
  description:
    'Official upstream MCP name: onelake_list_tables. List Iceberg tables in a OneLake namespace.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...workspaceAndItemSchema,
      namespace: z.string().optional().describe('Namespace name. Alias: schema.'),
      schema: z.string().optional().describe('Schema name alias for namespace.')
    })
  )
  .output(
    z.object({
      workspace: z.string().describe('Resolved workspace reference.'),
      item: z.string().describe('Resolved item reference.'),
      namespace: z.string().describe('Resolved namespace.'),
      tables: z.unknown().describe('OneLake tables response.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let namespace = resolveNamespace(ctx.input);
    let tables = await createOneLakeClient(ctx).listTables({ workspace, item, namespace });

    return {
      output: { workspace, item, namespace, tables },
      message: `Returned tables in namespace **${namespace}** for **${item}**.`
    };
  })
  .build();

export let onelakeGetTable = SlateTool.create(spec, {
  name: 'OneLake Get Table',
  key: 'onelake_get_table',
  description:
    'Official upstream MCP name: onelake_get_table. Get metadata for a OneLake Iceberg table.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      ...workspaceAndItemSchema,
      namespace: z.string().optional().describe('Namespace name. Alias: schema.'),
      schema: z.string().optional().describe('Schema name alias for namespace.'),
      table: z.string().describe('Table name.')
    })
  )
  .output(
    z.object({
      workspace: z.string().describe('Resolved workspace reference.'),
      item: z.string().describe('Resolved item reference.'),
      namespace: z.string().describe('Resolved namespace.'),
      table: z.string().describe('Table name.'),
      metadata: z.unknown().describe('OneLake table response.')
    })
  )
  .handleInvocation(async ctx => {
    let workspace = resolveWorkspaceReference(ctx.input);
    let item = resolveItemReference(ctx.input);
    let namespace = resolveNamespace(ctx.input);
    let metadata = await createOneLakeClient(ctx).getTable({
      workspace,
      item,
      namespace,
      table: ctx.input.table
    });

    return {
      output: { workspace, item, namespace, table: ctx.input.table, metadata },
      message: `Returned table **${ctx.input.table}** in namespace **${namespace}**.`
    };
  })
  .build();
