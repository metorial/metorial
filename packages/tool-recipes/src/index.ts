import {
  type SlateActionParameters,
  type SlateActionScopes,
  type SlateAttachment,
  type SlateContext,
  SlateTool
} from 'slates';
import type { z } from 'zod';

export type ToolRecipeInvocationResult<OutputType extends {}> = Promise<{
  output: OutputType;
  message: string;
  attachments?: SlateAttachment[];
}>;

export type ToolRecipeInvocationParams<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  Dependencies
> = {
  ctx: SlateContext<ConfigType, AuthType, InputType>;
  dependencies: Dependencies;
};

export type ToolRecipeParameters<
  Dependencies,
  InputSchema extends z.ZodType<any>,
  OutputSchema extends z.ZodType<any>
> = Pick<
  SlateActionParameters,
  'key' | 'name' | 'description' | 'instructions' | 'constraints' | 'tags' | 'metadata'
> & {
  inputSchema: InputSchema;
  outputSchema: OutputSchema;
  defaultScopes?: SlateActionScopes;
  handleInvocation: (
    params: ToolRecipeInvocationParams<any, any, z.infer<InputSchema>, Dependencies>
  ) => ToolRecipeInvocationResult<z.infer<OutputSchema>>;
};

export type ToolRecipe<
  Dependencies,
  InputSchema extends z.ZodType<any>,
  OutputSchema extends z.ZodType<any>
> = Readonly<ToolRecipeParameters<Dependencies, InputSchema, OutputSchema>>;

export let defineToolRecipe = <
  Dependencies,
  InputSchema extends z.ZodType<any>,
  OutputSchema extends z.ZodType<any>
>(
  recipe: ToolRecipeParameters<Dependencies, InputSchema, OutputSchema>
): ToolRecipe<Dependencies, InputSchema, OutputSchema> => recipe;

export type IncludeToolParameters<
  _ConfigType extends {},
  _AuthType extends {},
  Dependencies,
  InputSchema extends z.ZodType<any>,
  OutputSchema extends z.ZodType<any>
> = {
  recipe: ToolRecipe<Dependencies, InputSchema, OutputSchema>;
  spec: any;
  dependencies: Dependencies;
  toolFactory?: any;
  key?: string;
  name?: string;
  description?: string;
  instructions?: string[];
  constraints?: string[];
  tags?: SlateActionParameters['tags'];
  metadata?: SlateActionParameters['metadata'];
  scopes?: SlateActionScopes;
};

export let includeTool = <
  ConfigType extends {},
  AuthType extends {},
  Dependencies,
  InputSchema extends z.ZodType<any>,
  OutputSchema extends z.ZodType<any>
>({
  recipe,
  spec,
  dependencies,
  toolFactory,
  key,
  name,
  description,
  instructions,
  constraints,
  tags,
  metadata,
  scopes
}: IncludeToolParameters<
  ConfigType,
  AuthType,
  Dependencies,
  InputSchema,
  OutputSchema
>): any => {
  let ToolFactory = toolFactory ?? SlateTool;
  let builder: any = ToolFactory.create(spec, {
    key: key ?? recipe.key,
    name: name ?? recipe.name,
    description: description ?? recipe.description,
    instructions: instructions ?? recipe.instructions,
    constraints: constraints ?? recipe.constraints,
    tags: tags ?? recipe.tags,
    metadata: metadata ?? recipe.metadata
  })
    .input(recipe.inputSchema)
    .output(recipe.outputSchema);

  let appliedScopes = scopes ?? recipe.defaultScopes;
  if (appliedScopes) {
    builder = builder.scopes(appliedScopes);
  }

  return builder
    .handleInvocation(async (ctx: any) =>
      recipe.handleInvocation({
        ctx,
        dependencies
      })
    )
    .build();
};
