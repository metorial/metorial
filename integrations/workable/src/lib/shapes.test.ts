import { describe, expect, it } from 'vitest';
import {
  buildCandidateCreateRequest,
  buildEmployeeBody,
  buildRequisitionBody,
  buildTimeOffRequestBody,
  compact
} from './shapes';

describe('Workable output shape mappers', () => {
  it('omits null and undefined fields from optional tool output', () => {
    expect(
      compact({
        accountName: 'Example',
        description: null,
        subdomain: undefined
      })
    ).toEqual({
      accountName: 'Example'
    });
  });
});

describe('Workable request shape builders', () => {
  it('builds candidate create payload with stage query and root sourced flag', () => {
    let request = buildCandidateCreateRequest({
      jobShortcode: 'ENG',
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      stage: 'sourced',
      sourced: true,
      resumeUrl: 'https://example.com/resume.pdf',
      tags: ['founder']
    });

    expect(request).toEqual({
      params: {
        stage: 'sourced'
      },
      body: {
        sourced: true,
        candidate: {
          name: 'Ada Lovelace',
          firstname: 'Ada',
          lastname: 'Lovelace',
          email: 'ada@example.com',
          resume_url: 'https://example.com/resume.pdf',
          tags: ['founder']
        }
      }
    });
  });

  it('wraps employee create/update fields in Workable employee envelope', () => {
    expect(
      buildEmployeeBody({
        memberId: 'member-1',
        state: 'draft',
        firstname: 'Grace',
        lastname: 'Hopper',
        workEmail: 'grace@example.com',
        departmentId: 'dep-1'
      })
    ).toEqual({
      member_id: 'member-1',
      state: 'draft',
      employee: {
        firstname: 'Grace',
        lastname: 'Hopper',
        work_email: 'grace@example.com',
        department_id: 'dep-1'
      }
    });
  });

  it('builds requisition payload with code object and documented member fields', () => {
    expect(
      buildRequisitionBody({
        memberId: 'member-1',
        requisitionCode: 'REQ-001',
        ownerId: 'owner-1',
        hiringManagerId: 'manager-1',
        jobTitle: 'Engineering Manager',
        planDate: '2026-07-15',
        salaryCurrency: 'USD'
      })
    ).toEqual({
      member_id: 'member-1',
      code: {
        value: 'REQ-001'
      },
      owner_id: 'owner-1',
      hiring_manager_id: 'manager-1',
      job_title: 'Engineering Manager',
      plan_date: '2026-07-15',
      salary_currency: 'USD'
    });
  });

  it('builds time-off create payload using Workable /timeoff field names', () => {
    expect(
      buildTimeOffRequestBody({
        employeeId: 'employee-1',
        memberId: 'member-1',
        categoryId: 'vacation',
        fromDate: '2026-07-01T00:00:00.000',
        toDate: '2026-07-03T00:00:00.000',
        halfDays: ['2026-07-03'],
        note: 'Summer leave'
      })
    ).toEqual({
      employee_id: 'employee-1',
      member_id: 'member-1',
      category_id: 'vacation',
      from_date: '2026-07-01T00:00:00.000',
      to_date: '2026-07-03T00:00:00.000',
      half_days: ['2026-07-03'],
      note: 'Summer leave'
    });
  });
});
