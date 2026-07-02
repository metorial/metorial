import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let nutritionItemSchema = z.object({
  name: z.string().optional().describe('Food item name'),
  servingSizeG: z.number().describe('Serving size in grams'),
  calories: z.number().optional().describe('Calories (kcal)'),
  fatTotalG: z.number().describe('Total fat in grams'),
  fatSaturatedG: z.number().describe('Saturated fat in grams'),
  proteinG: z.number().optional().describe('Protein in grams'),
  sodiumMg: z.number().describe('Sodium in milligrams'),
  potassiumMg: z.number().describe('Potassium in milligrams'),
  cholesterolMg: z.number().describe('Cholesterol in milligrams'),
  carbohydratesTotalG: z.number().describe('Total carbohydrates in grams'),
  fiberG: z.number().describe('Fiber in grams'),
  sugarG: z.number().describe('Sugar in grams')
});

export let getNutrition = SlateTool.create(spec, {
  name: 'Get Nutrition Info',
  key: 'get_nutrition',
  description: `Extract nutrition information from a natural language food description. Describe what you ate in plain English (e.g. "3 eggs and 2 slices of toast") and get detailed nutritional breakdown per item.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Natural language description of food (e.g. "1 cup of rice and 200g chicken breast")'
        )
    })
  )
  .output(
    z.object({
      items: z
        .array(nutritionItemSchema)
        .describe('Nutrition data for each identified food item')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getNutrition(ctx.input.query);
    let items = Array.isArray(result) ? result : [result];

    let mapped = items.map((item: any) => ({
      name: item.name,
      servingSizeG: item.serving_size_g,
      calories: item.calories,
      fatTotalG: item.fat_total_g,
      fatSaturatedG: item.fat_saturated_g,
      proteinG: item.protein_g,
      sodiumMg: item.sodium_mg,
      potassiumMg: item.potassium_mg,
      cholesterolMg: item.cholesterol_mg,
      carbohydratesTotalG: item.carbohydrates_total_g,
      fiberG: item.fiber_g,
      sugarG: item.sugar_g
    }));

    let totalCalories = mapped.reduce((sum: number, i: any) => sum + (i.calories ?? 0), 0);

    return {
      output: { items: mapped },
      message: `Found nutrition data for **${mapped.length}** item(s). Total calories: **${totalCalories} kcal**.`
    };
  })
  .build();
