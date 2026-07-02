import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleClassroomScopes } from './scopes';

let googleAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let profileAxios = createAxios({
  baseURL: 'https://www.googleapis.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Google OAuth',
    key: 'google_oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://support.google.com/cloud/answer/15544987'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.google.com/identity/protocols/oauth2/scopes'
      }
    ],

    scopes: [
      {
        title: 'Manage Courses',
        description: 'Create, edit, and delete classes',
        scope: googleClassroomScopes.classroomCourses
      },
      {
        title: 'View Courses',
        description: 'View classes',
        scope: googleClassroomScopes.classroomCoursesReadonly
      },
      {
        title: 'Manage Rosters',
        description: 'Manage class rosters',
        scope: googleClassroomScopes.classroomRosters
      },
      {
        title: 'View Rosters',
        description: 'View class rosters',
        scope: googleClassroomScopes.classroomRostersReadonly
      },
      {
        title: 'Manage Own Coursework',
        description: 'Manage own coursework and grades',
        scope: googleClassroomScopes.classroomCourseworkMe
      },
      {
        title: 'View Own Coursework',
        description: 'View own coursework and grades',
        scope: googleClassroomScopes.classroomCourseworkMeReadonly
      },
      {
        title: 'Manage Student Coursework',
        description: 'Manage coursework and grades for students in classes you teach',
        scope: googleClassroomScopes.classroomCourseworkStudents
      },
      {
        title: 'View Student Coursework',
        description: 'View coursework and grades for students in classes you teach',
        scope: googleClassroomScopes.classroomCourseworkStudentsReadonly
      },
      {
        title: 'Manage Coursework Materials',
        description: 'Manage classwork materials',
        scope: googleClassroomScopes.classroomCourseworkmaterials
      },
      {
        title: 'View Coursework Materials',
        description: 'View classwork materials',
        scope: googleClassroomScopes.classroomCourseworkmaterialsReadonly
      },
      {
        title: 'Manage Announcements',
        description: 'Manage announcements',
        scope: googleClassroomScopes.classroomAnnouncements
      },
      {
        title: 'View Announcements',
        description: 'View announcements',
        scope: googleClassroomScopes.classroomAnnouncementsReadonly
      },
      {
        title: 'Manage Topics',
        description: 'Manage topics',
        scope: googleClassroomScopes.classroomTopics
      },
      {
        title: 'View Topics',
        description: 'View topics',
        scope: googleClassroomScopes.classroomTopicsReadonly
      },
      {
        title: 'Manage Guardians',
        description: 'Manage guardians for students',
        scope: googleClassroomScopes.classroomGuardianlinksStudents
      },
      {
        title: 'View Guardians',
        description: 'View guardians for students',
        scope: googleClassroomScopes.classroomGuardianlinksStudentsReadonly
      },
      {
        title: 'View Own Guardians',
        description: 'View own guardians',
        scope: googleClassroomScopes.classroomGuardianlinksMeReadonly
      },
      {
        title: 'View Profile Emails',
        description: 'View email addresses of people in classes',
        scope: googleClassroomScopes.classroomProfileEmails
      },
      {
        title: 'View Profile Photos',
        description: 'View profile photos of people in classes',
        scope: googleClassroomScopes.classroomProfilePhotos
      },
      {
        title: 'Push Notifications',
        description: 'Receive notifications about Classroom data changes',
        scope: googleClassroomScopes.classroomPushNotifications
      },
      {
        title: 'Manage Add-ons (Teacher)',
        description: 'Manage add-on attachments as a teacher',
        scope: googleClassroomScopes.classroomAddonsTeacher
      },
      {
        title: 'View Add-ons (Student)',
        description: 'View/update add-on attachments as a student',
        scope: googleClassroomScopes.classroomAddonsStudent
      },
      {
        title: 'View Own Submissions',
        description: 'View own submissions and grades',
        scope: googleClassroomScopes.classroomStudentSubmissionsMeReadonly
      },
      {
        title: 'View Student Submissions',
        description: 'View student submissions in classes you teach',
        scope: googleClassroomScopes.classroomStudentSubmissionsStudentsReadonly
      },
      {
        title: 'User Profile Info',
        description: 'View basic profile information',
        scope: googleClassroomScopes.userInfoProfile
      },
      {
        title: 'User Email',
        description: 'View email address',
        scope: googleClassroomScopes.userInfoEmail
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        access_type: 'offline',
        state: ctx.state,
        prompt: 'consent'
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      let grantedScopes =
        typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        },
        scopes: grantedScopes
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await profileAxios.get('/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          email: data.email,
          name: data.name,
          imageUrl: data.picture
        }
      };
    }
  });
