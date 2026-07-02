import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let enrollmentChanges = SlateTrigger.create(spec, {
  name: 'Enrollment Changes',
  key: 'enrollment_changes',
  description:
    'Triggers when users are enrolled in or unenrolled from a specific course/org unit. Polls the enrollment list and detects additions and removals.'
})
  .input(
    z.object({
      eventType: z.enum(['enrolled', 'unenrolled']).describe('Type of enrollment change'),
      userId: z.string().describe('User ID affected'),
      orgUnitId: z.string().describe('Org unit ID'),
      roleId: z.string().optional().describe('Role ID'),
      roleName: z.string().optional().describe('Role name'),
      userName: z.string().optional().describe('User display name')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID affected'),
      orgUnitId: z.string().describe('Org unit ID'),
      roleId: z.string().optional().describe('Role ID'),
      roleName: z.string().optional().describe('Role name'),
      userName: z.string().optional().describe('User display name')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.config, ctx.auth);
      let state = ctx.state as {
        knownEnrollments?: Record<string, string>;
        orgUnitId?: string;
      } | null;

      // We poll all enrollments of the current user's enrollments to detect changes
      let result = await client.getMyEnrollments({ canAccess: 'true' });
      let items = result?.Items || (Array.isArray(result) ? result : []);

      let currentEnrollments: Record<string, string> = {};
      for (let item of items) {
        let orgUnitId = String(item.OrgUnit?.Id);
        let name = item.OrgUnit?.Name || '';
        if (orgUnitId) {
          currentEnrollments[orgUnitId] = name;
        }
      }

      let inputs: any[] = [];
      let previousEnrollments = state?.knownEnrollments || {};

      // Detect new enrollments
      for (let orgUnitId of Object.keys(currentEnrollments)) {
        if (!previousEnrollments[orgUnitId]) {
          inputs.push({
            eventType: 'enrolled' as const,
            userId: 'current',
            orgUnitId,
            userName: currentEnrollments[orgUnitId]
          });
        }
      }

      // Detect removed enrollments (only if we have previous state)
      if (state?.knownEnrollments) {
        for (let orgUnitId of Object.keys(previousEnrollments)) {
          if (!currentEnrollments[orgUnitId]) {
            inputs.push({
              eventType: 'unenrolled' as const,
              userId: 'current',
              orgUnitId,
              userName: previousEnrollments[orgUnitId]
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownEnrollments: currentEnrollments
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `enrollment.${ctx.input.eventType}`,
        id: `enrollment-${ctx.input.orgUnitId}-${ctx.input.userId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          userId: ctx.input.userId,
          orgUnitId: ctx.input.orgUnitId,
          roleId: ctx.input.roleId,
          roleName: ctx.input.roleName,
          userName: ctx.input.userName
        }
      };
    }
  })
  .build();
