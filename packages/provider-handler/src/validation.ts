import { ServiceError, validationError } from '@lowerdeck/error';
import type z from 'zod';

export let zodToValidationError = (entity: string, message: string, e: z.ZodError) => {
  return validationError({
    message,
    entity,
    errors: e.issues.map(i => ({
      ...i,
      path: i.path.map(p => String(p))
    }))
  });
};

export let validate = <T>(
  schema: z.ZodType<T>,
  data: unknown,
  entity: string,
  message: string
): T => {
  let result = schema.safeParse(data);
  if (!result.success) {
    throw new ServiceError(zodToValidationError(entity, message, result.error));
  }

  return result.data;
};

export let toJsonSchema = (schema: z.ZodType<any>) =>
  schema.toJSONSchema({
    unrepresentable: 'any',
    override: ctx => {
      let def = ctx.zodSchema._zod.def;

      if (def.type === 'date') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
      if (def.type === 'bigint') {
        ctx.jsonSchema.type = 'number';
      }
    }
  });
