import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let classroomClientMocks = vi.hoisted(() => ({
  deleteCourseWork: vi.fn(),
  updateCourseWork: vi.fn()
}));

vi.mock('./lib/client', () => ({
  ClassroomClient: class {
    deleteCourseWork(...args: unknown[]) {
      return classroomClientMocks.deleteCourseWork(...args);
    }

    updateCourseWork(...args: unknown[]) {
      return classroomClientMocks.updateCourseWork(...args);
    }
  }
}));

import { provider } from './index';

let createClassroomToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'google_oauth',
        output: { token: 'test-token' }
      }
    }
  });

describe('Google Classroom coursework tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('patches only masked coursework fields and supports clearing optional fields', async () => {
    classroomClientMocks.updateCourseWork.mockResolvedValue({
      id: 'work-1',
      courseId: 'course-1',
      title: 'Updated assignment',
      maxPoints: 75,
      state: 'PUBLISHED',
      updateTime: '2026-07-14T10:00:00Z'
    });
    let client = createClassroomToolTestClient();

    let result = await client.invokeTool('update_coursework', {
      courseId: 'course-1',
      courseWorkId: 'work-1',
      updateMask: ['title', 'description', 'maxPoints', 'title'],
      title: 'Updated assignment',
      maxPoints: 75
    });

    expect(classroomClientMocks.updateCourseWork).toHaveBeenCalledWith(
      'course-1',
      'work-1',
      {
        title: 'Updated assignment',
        maxPoints: 75
      },
      'title,description,maxPoints'
    );
    expect(result.output).toMatchObject({
      courseWorkId: 'work-1',
      courseId: 'course-1',
      title: 'Updated assignment',
      maxPoints: 75,
      updatedFields: ['title', 'description', 'maxPoints']
    });
  });

  it('rejects provided coursework values omitted from updateMask', async () => {
    let client = createClassroomToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('update_coursework', {
          courseId: 'course-1',
          courseWorkId: 'work-1',
          updateMask: ['title'],
          title: 'Updated assignment',
          maxPoints: 75
        }),
      'Add these provided fields to updateMask: maxPoints.'
    );
    expect(classroomClientMocks.updateCourseWork).not.toHaveBeenCalled();
  });

  it('rejects clearing the required coursework title', async () => {
    let client = createClassroomToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('update_coursework', {
          courseId: 'course-1',
          courseWorkId: 'work-1',
          updateMask: ['title']
        }),
      'title is required when updateMask includes title.'
    );
    expect(classroomClientMocks.updateCourseWork).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'updateMask touches dueDate without dueTime',
      input: {
        updateMask: ['dueDate'],
        dueDate: { year: 2026, month: 8, day: 1 }
      }
    },
    {
      name: 'updateMask touches dueTime without dueDate',
      input: {
        updateMask: ['dueTime'],
        dueTime: { hours: 23, minutes: 59 }
      }
    },
    {
      name: 'a dueDate value is set while dueTime is cleared',
      input: {
        updateMask: ['dueDate', 'dueTime'],
        dueDate: { year: 2026, month: 8, day: 1 }
      }
    }
  ])('rejects the due-date update when $name', async ({ input }) => {
    let client = createClassroomToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('update_coursework', {
          courseId: 'course-1',
          courseWorkId: 'work-1',
          ...input
        }),
      'Google Classroom requires dueDate and dueTime to change together.'
    );
    expect(classroomClientMocks.updateCourseWork).not.toHaveBeenCalled();
  });

  it('sets dueDate and dueTime together and supports clearing both', async () => {
    classroomClientMocks.updateCourseWork.mockResolvedValue({
      id: 'work-1',
      courseId: 'course-1',
      title: 'Assignment',
      dueDate: { year: 2026, month: 8, day: 1 },
      dueTime: { hours: 23, minutes: 59 }
    });
    let client = createClassroomToolTestClient();

    await client.invokeTool('update_coursework', {
      courseId: 'course-1',
      courseWorkId: 'work-1',
      updateMask: ['dueDate', 'dueTime'],
      dueDate: { year: 2026, month: 8, day: 1 },
      dueTime: { hours: 23, minutes: 59 }
    });

    expect(classroomClientMocks.updateCourseWork).toHaveBeenCalledWith(
      'course-1',
      'work-1',
      {
        dueDate: { year: 2026, month: 8, day: 1 },
        dueTime: { hours: 23, minutes: 59 }
      },
      'dueDate,dueTime'
    );

    await client.invokeTool('update_coursework', {
      courseId: 'course-1',
      courseWorkId: 'work-1',
      updateMask: ['dueDate', 'dueTime']
    });

    expect(classroomClientMocks.updateCourseWork).toHaveBeenLastCalledWith(
      'course-1',
      'work-1',
      {},
      'dueDate,dueTime'
    );
  });

  it('rejects fractional maximum points before calling Classroom', async () => {
    let client = createClassroomToolTestClient();

    await expect(
      client.invokeTool('update_coursework', {
        courseId: 'course-1',
        courseWorkId: 'work-1',
        updateMask: ['maxPoints'],
        maxPoints: 7.5
      })
    ).rejects.toThrow();
    expect(classroomClientMocks.updateCourseWork).not.toHaveBeenCalled();
  });

  it('deletes coursework and returns cleanup identifiers', async () => {
    classroomClientMocks.deleteCourseWork.mockResolvedValue({});
    let client = createClassroomToolTestClient();

    let result = await client.invokeTool('delete_coursework', {
      courseId: 'course-1',
      courseWorkId: 'work-1'
    });

    expect(classroomClientMocks.deleteCourseWork).toHaveBeenCalledWith('course-1', 'work-1');
    expect(result.output).toEqual({
      success: true,
      courseId: 'course-1',
      courseWorkId: 'work-1'
    });
  });

  it('reports Classroom API failures as user-facing service errors', async () => {
    classroomClientMocks.deleteCourseWork.mockRejectedValue({
      response: {
        status: 403,
        statusText: 'Forbidden',
        data: { error: { message: 'Coursework belongs to a different developer project.' } }
      }
    });
    let client = createClassroomToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('delete_coursework', {
          courseId: 'course-1',
          courseWorkId: 'work-1'
        }),
      'Google Classroom API delete coursework failed: HTTP 403 Forbidden: Coursework belongs to a different developer project.'
    );
  });
});
