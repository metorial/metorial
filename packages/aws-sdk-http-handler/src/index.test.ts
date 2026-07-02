import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse
} from 'node:http';
import type { AddressInfo } from 'node:net';
import { HttpRequest } from '@smithy/protocol-http';
import { runWithContext, SlateContext } from 'slates';
import { describe, expect, it } from 'vitest';
import { SlatesAwsSdkHttpHandler } from './index';

let logger = {
  info() {},
  warn() {},
  error() {},
  progress() {}
};

let withSlateContext = async <T>(
  run: (context: SlateContext<any, any, any>) => Promise<T>
) => {
  let context = new SlateContext(
    {},
    {},
    {},
    { key: 'aws-sdk-http-handler-test' } as any,
    logger as any
  );
  let result = await runWithContext(context, () => run(context));

  return { context, result };
};

let listen = async (
  handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
) => {
  let server = createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch(error => {
      res.destroy(error instanceof Error ? error : new Error(String(error)));
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  return {
    server,
    port: (server.address() as AddressInfo).port
  };
};

let closeServer = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });

let readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(Buffer.from(chunk)));
    req.on('error', reject);
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

let requestFor = (
  port: number,
  options: Partial<ConstructorParameters<typeof HttpRequest>[0]>
) =>
  new HttpRequest({
    protocol: 'http:',
    hostname: '127.0.0.1',
    port,
    path: '/',
    method: 'GET',
    headers: {},
    ...options
  });

describe('@slates/aws-sdk-http-handler', () => {
  it('forwards AWS SDK HTTP requests through Axios', async () => {
    let captured:
      | {
          method?: string;
          url?: string;
          headers: IncomingMessage['headers'];
          body: string;
        }
      | undefined;
    let { server, port } = await listen(async (req, res) => {
      captured = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: await readBody(req)
      };
      res.statusCode = 201;
      res.setHeader('X-Result', 'accepted');
      res.end('ok');
    });

    try {
      let handler = new SlatesAwsSdkHttpHandler();

      let { result } = await withSlateContext(() =>
        handler.handle(
          requestFor(port, {
            path: '/things',
            method: 'POST',
            query: {
              z: 'last',
              a: ['one', 'two'],
              bare: null,
              empty: ''
            },
            headers: {
              'content-type': 'text/plain',
              'x-custom': 'custom'
            },
            body: 'payload'
          })
        )
      );

      expect(result.response.statusCode).toBe(201);
      expect(result.response.headers['x-result']).toBe('accepted');
      expect(captured).toMatchObject({
        method: 'POST',
        url: '/things?a=one&a=two&bare&empty=&z=last',
        body: 'payload'
      });
      expect(captured?.headers['x-custom']).toBe('custom');
      expect(captured?.headers.accept).toBe('*/*');
      expect(captured?.headers['x-slates-provider']).toBe('aws-sdk-http-handler-test');
    } finally {
      await closeServer(server);
    }
  });

  it('preserves an AWS SDK provided Accept header', async () => {
    let capturedAccept: string | string[] | undefined;
    let { server, port } = await listen((req, res) => {
      capturedAccept = req.headers.accept;
      res.end();
    });

    try {
      let handler = new SlatesAwsSdkHttpHandler();
      await withSlateContext(() =>
        handler.handle(
          requestFor(port, {
            headers: {
              Accept: 'application/xml'
            }
          })
        )
      );

      expect(capturedAccept).toBe('application/xml');
    } finally {
      await closeServer(server);
    }
  });

  it('returns upstream error responses to the AWS SDK', async () => {
    let { server, port } = await listen((_req, res) => {
      res.statusCode = 503;
      res.statusMessage = 'Service Unavailable';
      res.end('try later');
    });

    try {
      let handler = new SlatesAwsSdkHttpHandler();
      let { result } = await withSlateContext(() =>
        handler.handle(requestFor(port, { path: '/unavailable' }))
      );

      expect(result.response.statusCode).toBe(503);
      expect(result.response.reason).toBe('Service Unavailable');
    } finally {
      await closeServer(server);
    }
  });

  it('records sanitized Slates HTTP traces', async () => {
    let { server, port } = await listen(async (req, res) => {
      await readBody(req);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, token: 'server-secret' }));
    });

    try {
      let handler = new SlatesAwsSdkHttpHandler();
      let { context } = await withSlateContext(async () => {
        await handler.handle(
          requestFor(port, {
            path: '/trace',
            method: 'POST',
            query: {
              visible: 'yes',
              token: 'client-token'
            },
            headers: {
              'content-type': 'application/json',
              authorization: 'Bearer client-secret',
              'x-api-key': 'client-api-key'
            },
            body: JSON.stringify({
              visible: 'yes',
              secret: 'client-secret'
            })
          })
        );
      });

      let trace = context.getHttpTraces()[0];
      expect(trace?.request.method).toBe('POST');
      expect(trace?.request.url).toContain('visible=yes');
      expect(trace?.request.url).not.toContain('client-token');
      expect(trace?.request.headers).toMatchObject({
        'x-slates-provider': 'aws-sdk-http-handler-test'
      });
      expect(trace?.request.headers).not.toHaveProperty('authorization');
      expect(trace?.request.headers).not.toHaveProperty('x-api-key');
      expect(trace?.request.body?.text).toContain('[redacted]');
      expect(trace?.request.body?.text).not.toContain('client-secret');
      expect(trace?.response?.status).toBe(200);
    } finally {
      await closeServer(server);
    }
  });

  it('does not follow redirects for signed AWS requests', async () => {
    let targetHit = false;
    let { server, port } = await listen((req, res) => {
      if (req.url === '/target') {
        targetHit = true;
      }

      res.statusCode = 302;
      res.setHeader('Location', '/target');
      res.end();
    });

    try {
      let handler = new SlatesAwsSdkHttpHandler();
      let { result } = await withSlateContext(() =>
        handler.handle(requestFor(port, { path: '/start' }))
      );

      expect(result.response.statusCode).toBe(302);
      expect(targetHit).toBe(false);
    } finally {
      await closeServer(server);
    }
  });

  it('maps Axios timeouts back to Smithy-classifiable errors', async () => {
    let { server, port } = await listen(() => {
      // Keep the request open until Axios aborts it.
    });

    try {
      let handler = new SlatesAwsSdkHttpHandler({ requestTimeout: 5 });
      let error = await withSlateContext(() =>
        handler.handle(requestFor(port, { path: '/timeout' }))
      )
        .then(() => null)
        .catch(err => err as Error & { code?: string; cause?: unknown });

      expect(error).toBeInstanceOf(Error);
      expect(error?.name).toBe('TimeoutError');
      expect(error?.cause).toBeTruthy();
    } finally {
      await closeServer(server);
    }
  });

  it('preserves Node network error codes for Smithy retry classification', async () => {
    let { server, port } = await listen((_req, res) => {
      res.end();
    });
    await closeServer(server);

    let handler = new SlatesAwsSdkHttpHandler({ requestTimeout: 100 });
    let error = await withSlateContext(() =>
      handler.handle(requestFor(port, { path: '/refused' }))
    )
      .then(() => null)
      .catch(err => err as Error & { code?: string; cause?: unknown });

    expect(error).toBeInstanceOf(Error);
    expect(error?.code).toBe('ECONNREFUSED');
    expect(error?.cause).toBeTruthy();
  });
});
