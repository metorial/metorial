import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  create: vi.fn(),
  api: {
    delete: vi.fn(),
    patch: vi.fn()
  }
}));

vi.mock('axios', () => ({
  default: {
    create: axiosMocks.create
  }
}));

import { ClassroomClient } from './lib/client';

describe('ClassroomClient coursework mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    axiosMocks.create.mockReturnValue(axiosMocks.api);
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
});
