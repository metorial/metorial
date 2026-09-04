import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it, vi } from 'vitest';
import type { ClickUpClient } from './client';
import { clickupServiceError } from './errors';
import {
  registerClickUpWebhooks,
  resolveClickUpWebhookWorkspaceId,
  unregisterClickUpWebhooks
} from './webhooks';

let createClient = () =>
  ({
    getWorkspaces: vi.fn(),
    createWebhook: vi.fn(),
    deleteWebhook: vi.fn()
  }) as unknown as ClickUpClient;

describe('ClickUp multi-workspace webhook helpers', () => {
  it('registers one webhook for every authorized Workspace', async () => {
    let client = createClient();
    vi.mocked(client.getWorkspaces).mockResolvedValue([
      { id: 'workspace-1' },
      { id: 'workspace-2' }
    ]);
    vi.mocked(client.createWebhook)
      .mockResolvedValueOnce({ id: 'webhook-1', secret: 'secret-1' })
      .mockResolvedValueOnce({ webhook: { id: 'webhook-2', secret: 'secret-2' } });

    let details = await registerClickUpWebhooks({
      client,
      endpoint: 'https://example.com/clickup',
      events: ['taskCreated', 'taskUpdated']
    });

    expect(details).toEqual({
      webhooks: [
        { workspaceId: 'workspace-1', webhookId: 'webhook-1', secret: 'secret-1' },
        { workspaceId: 'workspace-2', webhookId: 'webhook-2', secret: 'secret-2' }
      ]
    });
    expect(client.createWebhook).toHaveBeenNthCalledWith(1, 'workspace-1', {
      endpoint: 'https://example.com/clickup',
      events: ['taskCreated', 'taskUpdated']
    });
    expect(client.createWebhook).toHaveBeenNthCalledWith(2, 'workspace-2', {
      endpoint: 'https://example.com/clickup',
      events: ['taskCreated', 'taskUpdated']
    });
  });

  it('rejects connections with no authorized Workspaces', async () => {
    let client = createClient();
    vi.mocked(client.getWorkspaces).mockResolvedValue([]);

    await expect(
      registerClickUpWebhooks({
        client,
        endpoint: 'https://example.com/clickup',
        events: ['taskCreated']
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(client.createWebhook).not.toHaveBeenCalled();
  });

  it('rejects a create response without a webhook ID and rolls back prior registrations', async () => {
    let client = createClient();
    vi.mocked(client.getWorkspaces).mockResolvedValue([
      { id: 'workspace-1' },
      { id: 'workspace-2' }
    ]);
    vi.mocked(client.createWebhook)
      .mockResolvedValueOnce({ id: 'webhook-1', secret: 'secret-1' })
      .mockResolvedValueOnce({});

    await expect(
      registerClickUpWebhooks({
        client,
        endpoint: 'https://example.com/clickup',
        events: ['taskCreated']
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(client.deleteWebhook).toHaveBeenCalledTimes(1);
    expect(client.deleteWebhook).toHaveBeenCalledWith('webhook-1');
  });

  it('rejects a create response without a webhook secret and rolls back that webhook', async () => {
    let client = createClient();
    vi.mocked(client.getWorkspaces).mockResolvedValue([{ id: 'workspace-1' }]);
    vi.mocked(client.createWebhook).mockResolvedValueOnce({ id: 'webhook-1' });

    await expect(
      registerClickUpWebhooks({
        client,
        endpoint: 'https://example.com/clickup',
        events: ['taskCreated']
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(client.deleteWebhook).toHaveBeenCalledWith('webhook-1');
  });

  it('rolls back every prior webhook and rethrows the original registration error', async () => {
    let client = createClient();
    let registrationError = clickupServiceError('Registration failed.');
    vi.mocked(client.getWorkspaces).mockResolvedValue([
      { id: 'workspace-1' },
      { id: 'workspace-2' },
      { id: 'workspace-3' }
    ]);
    vi.mocked(client.createWebhook)
      .mockResolvedValueOnce({ id: 'webhook-1', secret: 'secret-1' })
      .mockResolvedValueOnce({ id: 'webhook-2', secret: 'secret-2' })
      .mockRejectedValueOnce(registrationError);
    vi.mocked(client.deleteWebhook)
      .mockRejectedValueOnce(clickupServiceError('Rollback failed.'))
      .mockResolvedValueOnce();

    await expect(
      registerClickUpWebhooks({
        client,
        endpoint: 'https://example.com/clickup',
        events: ['taskCreated']
      })
    ).rejects.toBe(registrationError);
    expect(client.deleteWebhook).toHaveBeenCalledTimes(2);
    expect(client.deleteWebhook).toHaveBeenNthCalledWith(1, 'webhook-1');
    expect(client.deleteWebhook).toHaveBeenNthCalledWith(2, 'webhook-2');
  });

  it('attempts every deletion and rethrows the first non-404 cleanup error', async () => {
    let client = createClient();
    let firstError = clickupServiceError('First cleanup failed.');
    let laterError = clickupServiceError('Later cleanup failed.');
    vi.mocked(client.deleteWebhook)
      .mockRejectedValueOnce(firstError)
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(laterError);

    await expect(
      unregisterClickUpWebhooks({
        client,
        details: {
          webhooks: [
            { workspaceId: 'workspace-1', webhookId: 'webhook-1', secret: 'secret-1' },
            { workspaceId: 'workspace-2', webhookId: 'webhook-2', secret: 'secret-2' },
            { workspaceId: 'workspace-3', webhookId: 'webhook-3', secret: 'secret-3' }
          ]
        }
      })
    ).rejects.toBe(firstError);
    expect(client.deleteWebhook).toHaveBeenCalledTimes(3);
  });

  it('treats already-deleted 404 webhooks as successful cleanup', async () => {
    let client = createClient();
    let notFound = clickupServiceError('Webhook not found.');
    notFound.data.upstreamStatus = 404;
    vi.mocked(client.deleteWebhook).mockRejectedValueOnce(notFound).mockResolvedValueOnce();

    await expect(
      unregisterClickUpWebhooks({
        client,
        details: {
          webhooks: [
            { workspaceId: 'workspace-1', webhookId: 'webhook-1', secret: 'secret-1' },
            { workspaceId: 'workspace-2', webhookId: 'webhook-2', secret: 'secret-2' }
          ]
        }
      })
    ).resolves.toBeUndefined();
    expect(client.deleteWebhook).toHaveBeenCalledTimes(2);
  });

  it('resolves the Workspace ID for a known webhook', () => {
    expect(
      resolveClickUpWebhookWorkspaceId(
        {
          webhooks: [
            { workspaceId: 'workspace-1', webhookId: 'webhook-1', secret: 'secret-1' },
            { workspaceId: 'workspace-2', webhookId: 'webhook-2', secret: 'secret-2' }
          ]
        },
        'webhook-2'
      )
    ).toBe('workspace-2');
  });

  it.each([
    undefined,
    '',
    'unknown-webhook'
  ])('rejects missing or unknown inbound webhook ID %s', webhookId => {
    expect(() =>
      resolveClickUpWebhookWorkspaceId(
        {
          webhooks: [
            { workspaceId: 'workspace-1', webhookId: 'webhook-1', secret: 'secret-1' }
          ]
        },
        webhookId
      )
    ).toThrow(ServiceError);
  });
});
