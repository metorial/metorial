import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleClassroomActionScopes } from './scopes';

describe('google-classroom provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-classroom',
        name: 'Google Classroom'
      },
      toolIds: [
        'list_courses',
        'get_course',
        'create_course',
        'update_course',
        'delete_course',
        'list_roster',
        'manage_roster',
        'manage_invitations',
        'list_coursework',
        'create_coursework',
        'manage_submissions',
        'manage_announcements',
        'manage_topics',
        'manage_coursework_materials',
        'manage_guardians',
        'get_user_profile',
        'manage_rubrics'
      ],
      triggerIds: [
        'inbound_webhook',
        'course_roster_changes',
        'coursework_changes',
        'announcement_changes'
      ],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'list_courses', readOnly: true },
        { id: 'get_course', readOnly: true },
        { id: 'delete_course', destructive: true },
        { id: 'list_roster', readOnly: true },
        { id: 'list_coursework', readOnly: true },
        { id: 'get_user_profile', readOnly: true }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'course_roster_changes', invocationType: 'polling' },
        { id: 'coursework_changes', invocationType: 'polling' },
        { id: 'announcement_changes', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(21);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([]);

    let expectedScopes = {
      list_courses: googleClassroomActionScopes.listCourses,
      get_course: googleClassroomActionScopes.getCourse,
      create_course: googleClassroomActionScopes.createCourse,
      update_course: googleClassroomActionScopes.updateCourse,
      delete_course: googleClassroomActionScopes.deleteCourse,
      list_roster: googleClassroomActionScopes.listRoster,
      manage_roster: googleClassroomActionScopes.manageRoster,
      manage_invitations: googleClassroomActionScopes.manageInvitations,
      list_coursework: googleClassroomActionScopes.listCoursework,
      create_coursework: googleClassroomActionScopes.createCoursework,
      manage_submissions: googleClassroomActionScopes.manageSubmissions,
      manage_announcements: googleClassroomActionScopes.manageAnnouncements,
      manage_topics: googleClassroomActionScopes.manageTopics,
      manage_coursework_materials: googleClassroomActionScopes.manageCourseworkMaterials,
      manage_guardians: googleClassroomActionScopes.manageGuardians,
      get_user_profile: googleClassroomActionScopes.getUserProfile,
      manage_rubrics: googleClassroomActionScopes.manageRubrics,
      inbound_webhook: googleClassroomActionScopes.inboundWebhook,
      course_roster_changes: googleClassroomActionScopes.courseRosterChanges,
      coursework_changes: googleClassroomActionScopes.courseworkChanges,
      announcement_changes: googleClassroomActionScopes.announcementChanges
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('View Courses')).toBe(true);
    expect(scopeTitles.has('User Email')).toBe(true);
  });
});
