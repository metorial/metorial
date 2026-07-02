import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let gradeChanges = SlateTrigger.create(spec, {
  name: 'Grade Changes',
  key: 'grade_changes',
  description:
    'Triggers when grade values are updated for students in a course. Monitors grade items in a specified org unit and detects changes to student scores.'
})
  .input(
    z.object({
      eventType: z.enum(['updated']).describe('Type of change'),
      orgUnitId: z.string().describe('Org unit ID'),
      gradeObjectId: z.string().describe('Grade object ID'),
      userId: z.string().describe('User ID whose grade changed'),
      displayedGrade: z.string().optional().describe('New displayed grade'),
      pointsNumerator: z.number().optional().describe('New points earned'),
      pointsDenominator: z.number().optional().describe('Points possible'),
      gradeObjectName: z.string().optional().describe('Grade item name')
    })
  )
  .output(
    z.object({
      orgUnitId: z.string().describe('Org unit ID'),
      gradeObjectId: z.string().describe('Grade object ID'),
      gradeObjectName: z.string().optional().describe('Grade item name'),
      userId: z.string().describe('User ID whose grade changed'),
      displayedGrade: z.string().optional().describe('New displayed grade'),
      pointsNumerator: z.number().optional().describe('New points earned'),
      pointsDenominator: z.number().optional().describe('Points possible')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds * 2 // Less frequent since we scan grade values
    },

    pollEvents: async ctx => {
      let state = ctx.state as {
        gradeSnapshots?: Record<string, string>;
        orgUnitId?: string;
        gradeObjectNames?: Record<string, string>;
      } | null;

      let client = createClient(ctx.config, ctx.auth);

      // Get the user's enrollments to find courses
      let enrollments = await client.getMyEnrollments({ canAccess: 'true' });
      let enrollmentItems =
        enrollments?.Items || (Array.isArray(enrollments) ? enrollments : []);

      // Limit to first 5 org units
      let orgUnitIds = enrollmentItems
        .slice(0, 5)
        .map((e: any) => String(e.OrgUnit?.Id))
        .filter(Boolean);

      let inputs: any[] = [];
      let newSnapshots: Record<string, string> = {};
      let gradeObjectNames: Record<string, string> = state?.gradeObjectNames || {};

      for (let orgUnitId of orgUnitIds) {
        try {
          let gradeObjects = await client.listGradeObjects(orgUnitId);
          let gradeItems = Array.isArray(gradeObjects)
            ? gradeObjects
            : gradeObjects?.Objects || [];

          // Limit to first 5 grade items per course
          for (let gradeItem of gradeItems.slice(0, 5)) {
            let gradeObjectId = String(gradeItem.Id);
            gradeObjectNames[gradeObjectId] = gradeItem.Name;

            try {
              let values = await client.getGradeValues(orgUnitId, gradeObjectId);
              let gradeValues = Array.isArray(values) ? values : values?.Objects || [];

              for (let gv of gradeValues) {
                let userId = String(gv.User?.Identifier || gv.UserId);
                let key = `${orgUnitId}-${gradeObjectId}-${userId}`;
                let snapshotValue = `${gv.PointsNumerator}-${gv.DisplayedGrade}`;

                newSnapshots[key] = snapshotValue;

                if (
                  state?.gradeSnapshots?.[key] &&
                  state.gradeSnapshots[key] !== snapshotValue
                ) {
                  inputs.push({
                    eventType: 'updated' as const,
                    orgUnitId,
                    gradeObjectId,
                    userId,
                    displayedGrade: gv.DisplayedGrade,
                    pointsNumerator: gv.PointsNumerator,
                    pointsDenominator: gv.PointsDenominator,
                    gradeObjectName: gradeItem.Name
                  });
                }
              }
            } catch {
              // Skip inaccessible grade values
            }
          }
        } catch {
          // Skip inaccessible courses
        }
      }

      return {
        inputs,
        updatedState: {
          gradeSnapshots: newSnapshots,
          gradeObjectNames
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `grade.${ctx.input.eventType}`,
        id: `grade-${ctx.input.orgUnitId}-${ctx.input.gradeObjectId}-${ctx.input.userId}-${Date.now()}`,
        output: {
          orgUnitId: ctx.input.orgUnitId,
          gradeObjectId: ctx.input.gradeObjectId,
          gradeObjectName: ctx.input.gradeObjectName,
          userId: ctx.input.userId,
          displayedGrade: ctx.input.displayedGrade,
          pointsNumerator: ctx.input.pointsNumerator,
          pointsDenominator: ctx.input.pointsDenominator
        }
      };
    }
  })
  .build();
