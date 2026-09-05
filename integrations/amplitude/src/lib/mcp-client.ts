import { Buffer } from 'node:buffer';
import { ServiceError } from '@lowerdeck/error';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  StreamableHTTPClientTransport,
  StreamableHTTPError
} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CallToolResultSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  createApiServiceError,
  createBase64Attachment,
  createTextAttachment,
  isApiErrorRecord,
  type SlateAttachment
} from 'slates';
import { z } from 'zod';
import { type AmplitudeMcpRegion, getAmplitudeMcpOrigin } from './mcp-auth';

export let amplitudeMcpTools = [
  'get_amplitude_context',
  'use_amp_experiments',
  'use_amp_flags',
  'search_amp_entities',
  'manage_amp_events',
  'get_amp_taxonomy',
  'get_amplitude_charts',
  'query_amplitude_data',
  'render_amplitude_chart',
  'save_chart_edits',
  'rename_chart',
  'use_amplitude_chart_monitors',
  'use_amp_dashboards',
  'use_amp_notebooks'
] as const;
export type AmplitudeMcpTool = (typeof amplitudeMcpTools)[number];

export type AmplitudeMcpAuth = {
  token: string;
  apiKey?: string;
  secretKey?: string;
  region?: AmplitudeMcpRegion;
};

export let amplitudeMcpOutputSchema = z.object({
  content: z
    .array(
      z.object({
        type: z.enum(['text', 'resource_link']),
        text: z.string().optional(),
        uri: z.string().optional(),
        name: z.string().optional(),
        mimeType: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        annotations: z.record(z.string(), z.unknown()).optional(),
        _meta: z.record(z.string(), z.unknown()).optional()
      })
    )
    .describe('Text results and links returned by Amplitude.'),
  structuredContent: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      'Structured Amplitude results, including identifiers and pagination cursors when provided.'
    ),
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Provider rendering metadata when supplied.'),
  partialFailure: z
    .boolean()
    .optional()
    .describe(
      'Some operations failed; inspect the provider results before retrying to avoid duplicating successful changes.'
    ),
  files: z
    .array(
      z.object({
        mimeType: z.string(),
        byteLength: z.number(),
        uri: z.string().optional()
      })
    )
    .describe('Metadata for downloadable files returned by Amplitude.')
});

export let withAmplitudeMcpClient = async <T>(
  auth: AmplitudeMcpAuth,
  operation: (client: Client) => Promise<T>
): Promise<T> => {
  if (
    !auth.token ||
    !auth.region ||
    auth.apiKey !== undefined ||
    auth.secretKey !== undefined
  ) {
    throw createApiServiceError('Connect with Amplitude MCP OAuth to use this tool.', {
      reason: 'amplitude_mcp_auth_required'
    });
  }
  let transport = new StreamableHTTPClientTransport(
    new URL(`${getAmplitudeMcpOrigin(auth.region)}/mcp`),
    {
      requestInit: { headers: { Authorization: `Bearer ${auth.token}` }, redirect: 'error' },
      fetch: (url, init) =>
        fetch(url, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([
                init.signal,
                AbortSignal.timeout(init.method === 'DELETE' ? 10_000 : 120_000)
              ])
            : AbortSignal.timeout(init?.method === 'DELETE' ? 10_000 : 120_000)
        })
    }
  );
  let client = new Client({ name: 'amplitude-analytics-integration', version: '0.2.1' });
  try {
    await client.connect(transport, { timeout: 30_000 });
    return await operation(client);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    // Only expose typed codes; SDK transport messages can contain credential-bearing bodies.
    const detail =
      error instanceof StreamableHTTPError
        ? ` HTTP ${error.code}.${error.code === 401 ? ' Reconnect your Amplitude account.' : error.code === 403 ? ' Your account lacks permission for this operation.' : ''}`
        : error instanceof McpError
          ? ` MCP error ${error.code}.`
          : '';
    throw createApiServiceError(
      `Amplitude MCP request failed.${detail} Check your connection, project permissions, and input, then retry.`,
      { reason: 'amplitude_mcp_error' }
    );
  } finally {
    // DELETE is optional for stateless servers. Close even if termination fails.
    try {
      await transport.terminateSession();
    } catch {
      /* Server may not support DELETE. */
    }
    await client.close().catch(() => undefined);
  }
};

export let callAmplitudeMcpTool = async (
  auth: AmplitudeMcpAuth,
  name: AmplitudeMcpTool,
  args: Record<string, unknown>
) => {
  if (!amplitudeMcpTools.includes(name)) {
    throw createApiServiceError('This Amplitude operation is not supported.', {
      reason: 'amplitude_mcp_unsupported_tool'
    });
  }
  if (name === 'manage_amp_events' && args.action !== 'get') {
    throw createApiServiceError('Manage Amplitude Events only supports read operations.', {
      reason: 'amplitude_mcp_read_only'
    });
  }
  if (
    (name === 'use_amp_experiments' && args.action !== 'get' && args.action !== 'analyze') ||
    (name === 'use_amp_flags' &&
      args.action !== 'get' &&
      args.action !== 'list_deployments') ||
    (name === 'get_amp_taxonomy' && args.action !== 'properties')
  ) {
    throw createApiServiceError(
      'This Amplitude tool only supports its named read operation.',
      {
        reason: 'amplitude_mcp_read_only'
      }
    );
  }
  return withAmplitudeMcpClient(auth, async client => {
    let result = CallToolResultSchema.parse(
      await client.callTool({ name, arguments: args }, CallToolResultSchema, {
        timeout: 120_000
      })
    );
    const payloads = result.content.flatMap(block => {
      if (block.type !== 'text') return [];
      try {
        const value: unknown = JSON.parse(block.text);
        return isApiErrorRecord(value) ? [value] : [];
      } catch {
        return [];
      }
    });
    const partialFailure = payloads.some(
      payload =>
        typeof payload.failedCount === 'number' &&
        payload.failedCount > 0 &&
        typeof payload.successfulCount === 'number' &&
        payload.successfulCount > 0
    );
    const businessFailure = payloads.some(
      payload =>
        !(typeof payload.successfulCount === 'number' && payload.successfulCount > 0) &&
        (payload.success === false ||
          (payload.successfulCount === 0 &&
            typeof payload.failedCount === 'number' &&
            payload.failedCount > 0))
    );
    if (result.isError || businessFailure) {
      let detail = result.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n')
        .split(auth.token)
        .join('[redacted]')
        .slice(0, 1500);
      throw createApiServiceError(
        `Amplitude could not complete ${name}.${detail ? ` ${detail}` : ''}`,
        {
          reason: 'amplitude_mcp_tool_error'
        }
      );
    }
    let output: z.infer<typeof amplitudeMcpOutputSchema> = {
      content: [],
      structuredContent: result.structuredContent,
      metadata: result._meta,
      ...(partialFailure ? { partialFailure: true } : {}),
      files: []
    };
    let attachments: SlateAttachment[] = [];
    const csvFiles = new Set<string>();
    const projectFiles = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(projectFiles);
      if (!isApiErrorRecord(value)) return value;
      if (value.type === 'text' && typeof value.text === 'string') {
        try {
          return { ...value, text: JSON.stringify(projectFiles(JSON.parse(value.text))) };
        } catch {
          return value;
        }
      }
      const projected = Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, projectFiles(item)])
      );
      // Analytics can return CSV in its JSON envelope instead of an MCP resource block.
      if (value.isCsvResponse === true && typeof value.csvResponse === 'string') {
        if (!csvFiles.has(value.csvResponse)) {
          csvFiles.add(value.csvResponse);
          attachments.push(createTextAttachment(value.csvResponse, 'text/csv'));
          output.files.push({
            mimeType: 'text/csv',
            byteLength: Buffer.byteLength(value.csvResponse)
          });
        }
        projected.csvResponse = undefined;
        projected.downloadableFile = {
          mimeType: 'text/csv',
          byteLength: Buffer.byteLength(value.csvResponse)
        };
      }
      return projected;
    };
    const structuredContent = projectFiles(result.structuredContent);
    if (isApiErrorRecord(structuredContent)) output.structuredContent = structuredContent;
    for (let block of result.content) {
      if (block.type === 'text') {
        const projected = projectFiles(block);
        output.content.push({
          ...block,
          text:
            isApiErrorRecord(projected) && typeof projected.text === 'string'
              ? projected.text
              : block.text
        });
      } else if (block.type === 'resource_link') {
        output.content.push({ ...block });
      } else if (block.type === 'image' || block.type === 'audio') {
        attachments.push(createBase64Attachment(block.data, block.mimeType));
        output.files.push({
          mimeType: block.mimeType,
          byteLength: Buffer.byteLength(block.data, 'base64')
        });
      } else if (block.type === 'resource') {
        let resource = block.resource;
        let mimeType =
          resource.mimeType ??
          ('text' in resource ? 'text/plain' : 'application/octet-stream');
        if ('text' in resource) {
          attachments.push(createTextAttachment(resource.text, mimeType));
          output.files.push({
            mimeType,
            byteLength: Buffer.byteLength(resource.text),
            uri: resource.uri
          });
        } else {
          attachments.push(createBase64Attachment(resource.blob, mimeType));
          output.files.push({
            mimeType,
            byteLength: Buffer.byteLength(resource.blob, 'base64'),
            uri: resource.uri
          });
        }
      }
    }
    return {
      output,
      attachments,
      message: partialFailure
        ? 'Amplitude completed some operations; inspect the failed items before retrying.'
        : 'Completed Amplitude operation.'
    };
  });
};
