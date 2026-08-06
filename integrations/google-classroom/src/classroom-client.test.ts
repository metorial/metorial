import { ServiceError } from '@lowerdeck/error';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = {
  api: {
    delete: vi.fn(),
    patch: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn()
      }
    }
  }
};

import { ClassroomClient } from './lib/client';

describe('ClassroomClient coursework mutations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(axios, 'create').mockReturnValue(axiosMocks.api as any);
    axiosMocks.api.patch.mockResolvedValue({ data: { id: 'work-1' } });
    axiosMocks.api.delete.mockResolvedValue({ data: {} });
  });

  it('patches the exact coursework resource with the exact updateMask', async () => {
    let client = new ClassroomClient({ token: 'test-token' });
    let body = {
      title: 'Updated assignment',
      gradingPeriodId: ''
    };

    await client.updateCourseWork('course-1', 'work-1', body, 'title,gradingPeriodId');

    expect(axiosMocks.api.patch).toHaveBeenCalledWith(
      '/courses/course-1/courseWork/work-1',
      body,
      { params: { updateMask: 'title,gradingPeriodId' } }
    );
  });

  it('deletes coursework without a request body', async () => {
    let client = new ClassroomClient({ token: 'test-token' });

    await client.deleteCourseWork('course-1', 'work-1');

    expect(axiosMocks.api.delete).toHaveBeenCalledWith('/courses/course-1/courseWork/work-1');
  });

  it('maps upstream failures before raw Axios request details leave the client', () => {
    let rejectResponse: ((error: unknown) => never) | undefined;
    axiosMocks.api.interceptors.response.use.mockImplementation((_onFulfilled, onRejected) => {
      rejectResponse = onRejected;
    });
    new ClassroomClient({ token: 'test-token' });

    let thrown: unknown;
    try {
      rejectResponse?.({
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          data: { error: { message: 'Retry later.' } }
        },
        config: {
          headers: { Authorization: 'Bearer sentinel-secret' }
        }
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ServiceError);
    expect(String(thrown)).not.toContain('sentinel-secret');
  });
});
