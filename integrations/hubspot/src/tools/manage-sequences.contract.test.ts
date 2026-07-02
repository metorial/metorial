import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let hubSpotClientMocks = vi.hoisted(() => ({
  enrollContactInSequence: vi.fn(),
  getSequence: vi.fn(),
  getSequenceEnrollmentStatus: vi.fn(),
  listSequences: vi.fn(),
  tokens: [] as string[]
}));

vi.mock('../lib/client', () => ({
  HubSpotClient: class {
    constructor(token: string) {
      hubSpotClientMocks.tokens.push(token);
    }

    listSequences(...args: unknown[]) {
      return hubSpotClientMocks.listSequences(...args);
    }

    getSequence(...args: unknown[]) {
      return hubSpotClientMocks.getSequence(...args);
    }

    enrollContactInSequence(...args: unknown[]) {
      return hubSpotClientMocks.enrollContactInSequence(...args);
    }

    getSequenceEnrollmentStatus(...args: unknown[]) {
      return hubSpotClientMocks.getSequenceEnrollmentStatus(...args);
    }
  }
}));

import { provider } from '../index';

let createHubSpotToolTestClient = (authOutput: Record<string, unknown> = {}) =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: {
          token: 'test-token',
          ...authOutput
        }
      }
    }
  });

let resetHubSpotClientMocks = () => {
  hubSpotClientMocks.enrollContactInSequence.mockReset();
  hubSpotClientMocks.getSequence.mockReset();
  hubSpotClientMocks.getSequenceEnrollmentStatus.mockReset();
  hubSpotClientMocks.listSequences.mockReset();
  hubSpotClientMocks.tokens.splice(0);
};

describe('HubSpot sequence tools', () => {
  beforeEach(() => {
    resetHubSpotClientMocks();
  });

  it('lists sequences with the authenticated OAuth user ID by default', async () => {
    hubSpotClientMocks.listSequences.mockResolvedValue({
      results: [
        {
          id: 'seq-1',
          name: 'Intro sequence',
          folderId: 'folder-1',
          userId: 'auth-user',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-02T10:00:00.000Z'
        }
      ],
      total: 1,
      paging: {
        next: {
          after: 'cursor-1'
        }
      }
    });

    let client = createHubSpotToolTestClient({ userId: 'auth-user' });
    let result = await client.invokeTool('list_sequences', { limit: 5 });

    expect(hubSpotClientMocks.tokens).toEqual(['test-token']);
    expect(hubSpotClientMocks.listSequences).toHaveBeenCalledWith('auth-user', 5, undefined);
    expect(result.output).toEqual({
      sequences: [
        {
          sequenceId: 'seq-1',
          name: 'Intro sequence',
          folderId: 'folder-1',
          userId: 'auth-user',
          createdAt: '2026-06-01T10:00:00.000Z',
          updatedAt: '2026-06-02T10:00:00.000Z'
        }
      ],
      hasMore: true,
      nextCursor: 'cursor-1',
      total: 1
    });
  });

  it('uses an explicit user ID when retrieving a sequence', async () => {
    hubSpotClientMocks.getSequence.mockResolvedValue({
      id: 'seq-1',
      name: 'Intro sequence',
      userId: 'input-user',
      steps: [{ type: 'EMAIL', subject: 'Hello' }],
      settings: { followUpDays: [1, 3] },
      dependencies: [{ fromStep: 0, toStep: 1 }]
    });

    let client = createHubSpotToolTestClient({ userId: 'auth-user' });
    let result = await client.invokeTool('get_sequence', {
      sequenceId: 'seq-1',
      userId: 'input-user'
    });

    expect(hubSpotClientMocks.getSequence).toHaveBeenCalledWith('seq-1', 'input-user');
    expect(result.output).toMatchObject({
      sequenceId: 'seq-1',
      name: 'Intro sequence',
      userId: 'input-user',
      steps: [{ type: 'EMAIL', subject: 'Hello' }],
      settings: { followUpDays: [1, 3] },
      dependencies: [{ fromStep: 0, toStep: 1 }]
    });
  });

  it('rejects sequence list requests when no HubSpot user ID is available', async () => {
    let client = createHubSpotToolTestClient();

    await expectSlateError(
      () => client.invokeTool('list_sequences', {}),
      'HubSpot userId is required'
    );
    expect(hubSpotClientMocks.listSequences).not.toHaveBeenCalled();
  });

  it('enrolls a contact in a sequence and maps enrollment metadata', async () => {
    hubSpotClientMocks.enrollContactInSequence.mockResolvedValue({
      id: 'enrollment-1',
      toEmail: 'recipient@example.com',
      enrolledAt: '2026-06-03T10:00:00.000Z',
      updatedAt: '2026-06-03T10:05:00.000Z'
    });

    let client = createHubSpotToolTestClient({ userId: 'auth-user' });
    let result = await client.invokeTool('enroll_contact_in_sequence', {
      sequenceId: 'seq-1',
      contactId: 'contact-1',
      senderEmail: 'sender@example.com'
    });

    expect(hubSpotClientMocks.enrollContactInSequence).toHaveBeenCalledWith('auth-user', {
      sequenceId: 'seq-1',
      contactId: 'contact-1',
      senderEmail: 'sender@example.com'
    });
    expect(result.output).toEqual({
      enrollmentId: 'enrollment-1',
      contactId: 'contact-1',
      sequenceId: 'seq-1',
      senderEmail: 'sender@example.com',
      toEmail: 'recipient@example.com',
      enrolledAt: '2026-06-03T10:00:00.000Z',
      updatedAt: '2026-06-03T10:05:00.000Z'
    });
  });

  it('rejects invalid sender email before enrolling a contact', async () => {
    let client = createHubSpotToolTestClient({ userId: 'auth-user' });

    await expect(
      client.invokeTool('enroll_contact_in_sequence', {
        sequenceId: 'seq-1',
        contactId: 'contact-1',
        senderEmail: 'not-an-email'
      })
    ).rejects.toThrow();
    expect(hubSpotClientMocks.enrollContactInSequence).not.toHaveBeenCalled();
  });

  it('normalizes a missing sequence enrollment to enrolled false', async () => {
    hubSpotClientMocks.getSequenceEnrollmentStatus.mockResolvedValue(null);

    let client = createHubSpotToolTestClient({ userId: 'auth-user' });
    let result = await client.invokeTool('get_sequence_enrollment_status', {
      contactId: 'contact-1'
    });

    expect(hubSpotClientMocks.getSequenceEnrollmentStatus).toHaveBeenCalledWith('contact-1');
    expect(result.output).toEqual({
      enrolled: false
    });
  });

  it('returns current enrollment details for an enrolled contact', async () => {
    hubSpotClientMocks.getSequenceEnrollmentStatus.mockResolvedValue({
      id: 'enrollment-1',
      sequenceId: 'seq-1',
      sequenceName: 'Intro sequence',
      toEmail: 'recipient@example.com',
      enrolledBy: 123,
      enrolledByEmail: 'sender@example.com',
      enrolledAt: '2026-06-03T10:00:00.000Z'
    });

    let client = createHubSpotToolTestClient({ userId: 'auth-user' });
    let result = await client.invokeTool('get_sequence_enrollment_status', {
      contactId: 'contact-1'
    });

    expect(result.output).toEqual({
      enrolled: true,
      enrollment: {
        enrollmentId: 'enrollment-1',
        contactId: 'contact-1',
        sequenceId: 'seq-1',
        sequenceName: 'Intro sequence',
        toEmail: 'recipient@example.com',
        enrolledBy: '123',
        enrolledByEmail: 'sender@example.com',
        enrolledAt: '2026-06-03T10:00:00.000Z'
      }
    });
  });
});
