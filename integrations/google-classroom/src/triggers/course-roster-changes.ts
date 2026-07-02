import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClassroomClient } from '../lib/client';
import { googleClassroomActionScopes } from '../scopes';
import { spec } from '../spec';

let rosterMemberSchema = z.object({
  courseId: z.string().optional().describe('Course ID'),
  userId: z.string().optional().describe('User ID'),
  role: z.enum(['teacher', 'student']).describe('Role of the member'),
  name: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      fullName: z.string().optional()
    })
    .optional()
    .describe('User name'),
  emailAddress: z.string().optional().describe('User email address'),
  photoUrl: z.string().optional().describe('User profile photo URL')
});

export let courseRosterChanges = SlateTrigger.create(spec, {
  name: 'Course Roster Changes',
  key: 'course_roster_changes',
  description:
    'Triggers when students or teachers are added to or removed from a course. Polls the course roster periodically and detects changes in the list of teachers and students.'
})
  .scopes(googleClassroomActionScopes.courseRosterChanges)
  .input(
    z.object({
      changeType: z
        .enum(['added', 'removed'])
        .describe('Whether the member was added or removed'),
      role: z.enum(['teacher', 'student']).describe('Role of the member'),
      courseId: z.string().describe('Course ID'),
      userId: z.string().describe('User ID'),
      memberData: z.any().optional().describe('Full member data from the API')
    })
  )
  .output(rosterMemberSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ClassroomClient({ token: ctx.auth.token });

      let previousState = ctx.state || {};
      let _previousTeacherIds: string[] = previousState.teacherIds || [];
      let _previousStudentIds: string[] = previousState.studentIds || [];
      let _courseId: string | undefined = previousState.courseId;

      // On first poll, we need to get the courses and pick the first one
      // or the user should have configured this. Since we can't configure per-trigger,
      // we'll poll all courses the user teaches and detect changes across all of them.
      // Actually, let's keep it simpler: poll all courses user is involved in.

      let inputs: Array<{
        changeType: 'added' | 'removed';
        role: 'teacher' | 'student';
        courseId: string;
        userId: string;
        memberData: any;
      }> = [];

      // Get all courses
      let coursesResult = await client.listCourses({ teacherId: 'me', pageSize: 100 });
      let courses = coursesResult.courses || [];

      let currentRosterMap: Record<string, string[]> = {};

      for (let course of courses) {
        let cId = course.id;
        if (!cId) continue;

        let teacherResult = await client.listTeachers(cId, 100);
        let studentResult = await client.listStudents(cId, 100);

        let teacherIds = (teacherResult.teachers || [])
          .map((t: any) => t.userId)
          .filter(Boolean) as string[];
        let studentIds = (studentResult.students || [])
          .map((s: any) => s.userId)
          .filter(Boolean) as string[];

        let key = `${cId}`;
        currentRosterMap[`${key}_teachers`] = teacherIds;
        currentRosterMap[`${key}_students`] = studentIds;

        let prevTeachers: string[] = previousState[`${key}_teachers`] || [];
        let prevStudents: string[] = previousState[`${key}_students`] || [];

        // Only detect changes if we have previous state (not the first run)
        if (previousState.initialized) {
          let addedTeachers = teacherIds.filter(id => !prevTeachers.includes(id));
          let removedTeachers = prevTeachers.filter(id => !teacherIds.includes(id));
          let addedStudents = studentIds.filter(id => !prevStudents.includes(id));
          let removedStudents = prevStudents.filter(id => !studentIds.includes(id));

          for (let userId of addedTeachers) {
            let member = (teacherResult.teachers || []).find((t: any) => t.userId === userId);
            inputs.push({
              changeType: 'added',
              role: 'teacher',
              courseId: cId,
              userId,
              memberData: member
            });
          }
          for (let userId of removedTeachers) {
            inputs.push({
              changeType: 'removed',
              role: 'teacher',
              courseId: cId,
              userId,
              memberData: null
            });
          }
          for (let userId of addedStudents) {
            let member = (studentResult.students || []).find((s: any) => s.userId === userId);
            inputs.push({
              changeType: 'added',
              role: 'student',
              courseId: cId,
              userId,
              memberData: member
            });
          }
          for (let userId of removedStudents) {
            inputs.push({
              changeType: 'removed',
              role: 'student',
              courseId: cId,
              userId,
              memberData: null
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          ...currentRosterMap,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      let { changeType, role, courseId, userId, memberData } = ctx.input;

      let profile = memberData?.profile;

      return {
        type: `roster.${changeType}`,
        id: `${courseId}_${role}_${userId}_${changeType}_${Date.now()}`,
        output: {
          courseId,
          userId,
          role,
          name: profile?.name,
          emailAddress: profile?.emailAddress,
          photoUrl: profile?.photoUrl
        }
      };
    }
  })
  .build();
