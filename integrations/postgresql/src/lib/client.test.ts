import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { PostgresClient } from './client';
import { AuthenticationTypes, buildMessage, MessageTypes, parseMessages } from './protocol';

interface WaitForMessageClient {
  waitForMessage(
    socket: EventEmitter,
    expectedType: number,
    currentBuffer: Uint8Array,
    timeoutMs: number
  ): Promise<{ msg: { type: number; body: Uint8Array }; remaining: Uint8Array }>;
}

let buildAuthenticationMessage = (authType: number): Uint8Array => {
  let body = new Uint8Array(4);
  new DataView(body.buffer).setInt32(0, authType, false);
  return buildMessage(MessageTypes.AUTHENTICATION, body);
};

describe('PostgresClient protocol handling', () => {
  it('preserves complete trailing messages after the awaited message', async () => {
    let client = new PostgresClient({
      host: '127.0.0.1',
      port: 5432,
      database: 'test',
      username: 'test',
      password: 'test',
      sslMode: 'disable'
    }) as unknown as WaitForMessageClient;

    let saslFinal = buildAuthenticationMessage(AuthenticationTypes.SASL_FINAL);
    let readyForQuery = buildMessage(MessageTypes.READY_FOR_QUERY, new Uint8Array([73]));
    let currentBuffer = new Uint8Array(saslFinal.length + readyForQuery.length);
    currentBuffer.set(saslFinal);
    currentBuffer.set(readyForQuery, saslFinal.length);

    let result = await client.waitForMessage(
      new EventEmitter(),
      MessageTypes.AUTHENTICATION,
      currentBuffer,
      1000
    );

    let authType = new DataView(
      result.msg.body.buffer,
      result.msg.body.byteOffset,
      result.msg.body.byteLength
    ).getInt32(0, false);
    expect(authType).toBe(AuthenticationTypes.SASL_FINAL);

    let parsedRemaining = parseMessages(result.remaining);
    expect(parsedRemaining.messages.map(msg => msg.type)).toEqual([
      MessageTypes.READY_FOR_QUERY
    ]);
    expect(parsedRemaining.remaining).toHaveLength(0);
  });
});
