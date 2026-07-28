import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { SonarQubeClient } from '../lib/client';
import { pingSystemTool } from './status';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SonarQube system tools', () => {
  it('exposes an exact empty object input schema', () => {
    let schema = z.toJSONSchema(pingSystemTool.inputSchema) as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };

    expect(schema.type).toBe('object');
    expect(schema.properties).toEqual({});
    expect(schema.required).toBeUndefined();
  });

  it('returns the ping response as structured output', async () => {
    let pingSystem = vi
      .spyOn(SonarQubeClient.prototype, 'pingSystem')
      .mockResolvedValue('pong');

    let result = await pingSystemTool.handleInvocation({
      auth: { token: 'token' },
      config: {
        deployment: 'server',
        serverBaseUrl: 'https://sonarqube.example.com'
      },
      input: {}
    } as never);

    expect(pingSystem).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      output: {
        response: 'pong'
      },
      message: 'SonarQube Server responded with **pong**.'
    });
  });
});
