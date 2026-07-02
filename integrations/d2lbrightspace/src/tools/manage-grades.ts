import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let gradeObjectSchema = z.object({
  gradeObjectId: z.string().describe('Grade object ID'),
  name: z.string().optional().describe('Grade item name'),
  gradeType: z.string().optional().describe('Grade type (Numeric, PassFail, SelectBox, Text)'),
  maxPoints: z.number().optional().describe('Maximum points'),
  weight: z.number().optional().describe('Weight value'),
  categoryId: z.string().optional().describe('Category ID'),
  description: z.string().optional().describe('Description')
});

export let listGradeItems = SlateTool.create(spec, {
  name: 'List Grade Items',
  key: 'list_grade_items',
  description: `List all grade objects (items) in a course's gradebook, including their type, max points, and weight. Also supports listing grade categories.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      includeCategories: z
        .boolean()
        .optional()
        .describe('Also include grade categories in the response')
    })
  )
  .output(
    z.object({
      gradeObjects: z.array(gradeObjectSchema).describe('List of grade items'),
      categories: z
        .array(
          z.object({
            categoryId: z.string().describe('Category ID'),
            name: z.string().optional().describe('Category name'),
            weight: z.number().optional().describe('Category weight')
          })
        )
        .optional()
        .describe('List of grade categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.listGradeObjects(ctx.input.orgUnitId);

    let items = Array.isArray(result) ? result : result?.Objects || [];
    let gradeObjects = items.map((g: any) => ({
      gradeObjectId: String(g.Id),
      name: g.Name,
      gradeType: g.GradeType,
      maxPoints: g.MaxPoints,
      weight: g.Weight,
      categoryId: g.CategoryId ? String(g.CategoryId) : undefined,
      description: g.Description?.Text || g.Description?.Content
    }));

    let categories: any[] | undefined;
    if (ctx.input.includeCategories) {
      let catResult = await client.listGradeCategories(ctx.input.orgUnitId);
      let catItems = Array.isArray(catResult) ? catResult : [];
      categories = catItems.map((c: any) => ({
        categoryId: String(c.Id),
        name: c.Name,
        weight: c.Weight
      }));
    }

    return {
      output: { gradeObjects, categories },
      message: `Found **${gradeObjects.length}** grade item(s) in org unit ${ctx.input.orgUnitId}.`
    };
  })
  .build();

export let getGradeValue = SlateTool.create(spec, {
  name: 'Get Grade Value',
  key: 'get_grade_value',
  description: `Retrieve a specific student's grade for a grade item, or get all students' grades for a grade item. Returns the displayed grade, points, and weighted values.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      gradeObjectId: z.string().describe('Grade object/item ID'),
      userId: z
        .string()
        .optional()
        .describe("User ID to get grade for. If omitted, returns all students' grades.")
    })
  )
  .output(
    z.object({
      grades: z
        .array(
          z.object({
            userId: z.string().optional().describe('Student user ID'),
            displayedGrade: z.string().optional().describe('Displayed grade string'),
            pointsNumerator: z.number().optional().describe('Points earned'),
            pointsDenominator: z.number().optional().describe('Points possible'),
            weightedNumerator: z.number().optional().describe('Weighted points earned'),
            weightedDenominator: z.number().optional().describe('Weighted points possible')
          })
        )
        .describe('Grade values')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    if (ctx.input.userId) {
      let grade = await client.getGradeValue(
        ctx.input.orgUnitId,
        ctx.input.gradeObjectId,
        ctx.input.userId
      );
      return {
        output: {
          grades: [
            {
              userId: ctx.input.userId,
              displayedGrade: grade.DisplayedGrade,
              pointsNumerator: grade.PointsNumerator,
              pointsDenominator: grade.PointsDenominator,
              weightedNumerator: grade.WeightedNumerator,
              weightedDenominator: grade.WeightedDenominator
            }
          ]
        },
        message: `Grade for user ${ctx.input.userId}: **${grade.DisplayedGrade || 'N/A'}** (${grade.PointsNumerator ?? 'N/A'}/${grade.PointsDenominator ?? 'N/A'}).`
      };
    }

    let result = await client.getGradeValues(ctx.input.orgUnitId, ctx.input.gradeObjectId);
    let items = Array.isArray(result) ? result : result?.Objects || [];
    let grades = items.map((g: any) => ({
      userId: String(g.User?.Identifier || g.UserId),
      displayedGrade: g.DisplayedGrade,
      pointsNumerator: g.PointsNumerator,
      pointsDenominator: g.PointsDenominator,
      weightedNumerator: g.WeightedNumerator,
      weightedDenominator: g.WeightedDenominator
    }));

    return {
      output: { grades },
      message: `Retrieved **${grades.length}** grade value(s) for grade item ${ctx.input.gradeObjectId}.`
    };
  })
  .build();

export let setGradeValue = SlateTool.create(spec, {
  name: 'Set Grade Value',
  key: 'set_grade_value',
  description: `Set or update a student's grade for a specific grade item. Supports setting point values and comments.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID'),
      gradeObjectId: z.string().describe('Grade object/item ID'),
      userId: z.string().describe('Student user ID'),
      pointsNumerator: z.number().describe('Points earned'),
      comments: z.string().optional().describe('Grade comments (HTML supported)'),
      privateComments: z
        .string()
        .optional()
        .describe('Private comments visible only to instructors')
    })
  )
  .output(
    z.object({
      displayedGrade: z.string().optional().describe('Displayed grade after update'),
      pointsNumerator: z.number().optional().describe('Updated points earned'),
      pointsDenominator: z.number().optional().describe('Points possible')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let gradeValue: any = {
      GradeObjectType: 1, // Numeric
      PointsNumerator: ctx.input.pointsNumerator
    };

    if (ctx.input.comments) {
      gradeValue.Comments = { Content: ctx.input.comments, Type: 'Html' };
    }
    if (ctx.input.privateComments) {
      gradeValue.PrivateComments = { Content: ctx.input.privateComments, Type: 'Html' };
    }

    let result = await client.setGradeValue(
      ctx.input.orgUnitId,
      ctx.input.gradeObjectId,
      ctx.input.userId,
      gradeValue
    );

    return {
      output: {
        displayedGrade: result.DisplayedGrade,
        pointsNumerator: result.PointsNumerator,
        pointsDenominator: result.PointsDenominator
      },
      message: `Set grade for user ${ctx.input.userId} on grade item ${ctx.input.gradeObjectId}: **${result.DisplayedGrade || ctx.input.pointsNumerator}**.`
    };
  })
  .build();

export let getFinalGrades = SlateTool.create(spec, {
  name: 'Get Final Grades',
  key: 'get_final_grades',
  description: `Retrieve final calculated grades for all students in a course.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgUnitId: z.string().describe('Course org unit ID')
    })
  )
  .output(
    z.object({
      grades: z
        .array(
          z.object({
            userId: z.string().optional().describe('Student user ID'),
            displayedGrade: z.string().optional().describe('Displayed final grade'),
            pointsNumerator: z.number().optional().describe('Final points earned'),
            pointsDenominator: z.number().optional().describe('Final points possible')
          })
        )
        .describe('Final grades')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.getFinalGrades(ctx.input.orgUnitId);

    let items = Array.isArray(result) ? result : result?.Objects || [];
    let grades = items.map((g: any) => ({
      userId: String(g.User?.Identifier || g.UserId),
      displayedGrade: g.DisplayedGrade,
      pointsNumerator: g.PointsNumerator,
      pointsDenominator: g.PointsDenominator
    }));

    return {
      output: { grades },
      message: `Retrieved final grades for **${grades.length}** student(s).`
    };
  })
  .build();
