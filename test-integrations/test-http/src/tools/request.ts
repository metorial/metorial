import { createAxios, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let httpAxios = createAxios({
  validateStatus: () => true,
  responseType: 'text',
  transformResponse: [data => data]
});

let methodEnum = z
  .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'])
  .describe('HTTP method.');

let normalizeHeaders = (raw: unknown): Record<string, string> => {
  let out: Record<string, string> = {};
  if (!raw) return out;

  if (typeof (raw as any).toJSON === 'function') {
    let asJson = (raw as any).toJSON();
    for (let [k, v] of Object.entries(asJson)) {
      if (v == null) continue;
      out[String(k).toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
    }
    return out;
  }

  for (let [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v == null) continue;
    out[String(k).toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
  }
  return out;
};

let tryParseJson = (body: string): unknown => {
  if (!body) return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
};

export let request = SlateTool.create(spec, {
  name: 'HTTP Request',
  key: 'request',
  description: `Send an arbitrary HTTP request using the built-in slates axios client. Returns the response status, headers, raw body text, and a parsed JSON body when the response is valid JSON. Non-2xx responses are NOT thrown — they are returned to the caller as-is.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      method: methodEnum.default('GET'),
      url: z.string().url().describe('Absolute URL to request.'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Headers to send with the request. Header names are case-insensitive.'),
      query: z
        .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
        .optional()
        .describe('Query-string parameters to append to the URL.'),
      jsonBody: z
        .unknown()
        .optional()
        .describe(
          'JSON-serializable body. When set, the request is sent with Content-Type: application/json (unless overridden in headers). Ignored for GET/HEAD.'
        ),
      textBody: z
        .string()
        .optional()
        .describe(
          'Raw request body as a string. Ignored when `jsonBody` is also provided. Ignored for GET/HEAD.'
        ),
      timeoutMs: z
        .number()
        .int()
        .min(0)
        .max(120_000)
        .default(30_000)
        .describe('Request timeout in milliseconds. 0 disables the timeout.'),
      maxResponseBytes: z
        .number()
        .int()
        .min(0)
        .max(5_000_000)
        .default(200_000)
        .describe(
          'Response body is truncated to this many bytes in the output. Set 0 to disable truncation.'
        )
    })
  )
  .output(
    z.object({
      status: z.number().describe('HTTP status code.'),
      statusText: z.string().describe('HTTP status text.'),
      ok: z.boolean().describe('True when status is in the 2xx range.'),
      url: z.string().describe('Final request URL including query parameters.'),
      method: z.string().describe('HTTP method actually used.'),
      headers: z
        .record(z.string(), z.string())
        .describe('Response headers (lowercased keys).'),
      body: z.string().describe('Raw response body text.'),
      bodyTruncated: z.boolean().describe('True when the body was truncated in the output.'),
      bodyByteLength: z.number().describe('Byte length of the full response body.'),
      json: z
        .unknown()
        .optional()
        .describe('Parsed JSON body, set only when the body is valid JSON.')
    })
  )
  .handleInvocation(async ctx => {
    let { method, url, headers, query, jsonBody, textBody, timeoutMs, maxResponseBytes } =
      ctx.input;

    let hasBody = method !== 'GET' && method !== 'HEAD';
    let data: string | undefined;
    let mergedHeaders: Record<string, string> = { ...(headers ?? {}) };
    let lowercaseHeaderKeys = new Set(Object.keys(mergedHeaders).map(k => k.toLowerCase()));

    if (hasBody && jsonBody !== undefined) {
      data = JSON.stringify(jsonBody);
      if (!lowercaseHeaderKeys.has('content-type')) {
        mergedHeaders['Content-Type'] = 'application/json';
      }
    } else if (hasBody && textBody !== undefined) {
      data = textBody;
    }

    let response = await httpAxios.request({
      url,
      method,
      headers: mergedHeaders,
      params: query,
      data,
      timeout: timeoutMs === 0 ? 0 : timeoutMs
    });

    let rawBody =
      typeof response.data === 'string' ? response.data : String(response.data ?? '');
    let bodyByteLength = Buffer.byteLength(rawBody, 'utf8');
    let truncated = false;
    let body = rawBody;
    if (maxResponseBytes > 0 && bodyByteLength > maxResponseBytes) {
      body = Buffer.from(rawBody, 'utf8').subarray(0, maxResponseBytes).toString('utf8');
      truncated = true;
    }

    let responseHeaders = normalizeHeaders(response.headers);
    let contentType = responseHeaders['content-type'] ?? '';
    let parsed = contentType.includes('json') ? tryParseJson(rawBody) : undefined;

    let finalUrl = response.request?.res?.responseUrl ?? response.config?.url ?? url;
    let status = response.status;
    let ok = status >= 200 && status < 300;

    return {
      output: {
        status,
        statusText: response.statusText ?? '',
        ok,
        url: String(finalUrl),
        method: String(response.config?.method ?? method).toUpperCase(),
        headers: responseHeaders,
        body,
        bodyTruncated: truncated,
        bodyByteLength,
        json: parsed
      },
      message: `**${method}** ${url} → **${status}${response.statusText ? ` ${response.statusText}` : ''}** (${bodyByteLength} bytes${truncated ? `, truncated to ${maxResponseBytes}` : ''}).`
    };
  })
  .build();
