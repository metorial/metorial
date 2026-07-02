import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let traitSchema = z.object({
  traitId: z.string().optional().describe('Unique trait ID'),
  name: z.string().describe('Trait name'),
  values: z
    .array(
      z.object({
        value: z.string().describe('Trait value'),
        traitValueId: z.string().optional().describe('Trait value ID')
      })
    )
    .optional()
    .describe('Possible values for this trait')
});

export let listTraits = SlateTool.create(spec, {
  name: 'List Traits',
  key: 'list_traits',
  description: `List all traits configured in the Wit.ai app. Traits are sentence-level classifiers (e.g., sentiment, politeness) that are distinct from entities.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      traits: z.array(traitSchema).describe('List of traits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let traits = await client.listTraits();

    return {
      output: {
        traits: (traits ?? []).map((t: Record<string, unknown>) => ({
          traitId: t.id,
          name: t.name,
          values: (t.values as Record<string, unknown>[] | undefined)?.map(v => ({
            value: v.value as string,
            traitValueId: v.id as string | undefined
          }))
        }))
      },
      message: `Found **${(traits ?? []).length}** trait(s).`
    };
  })
  .build();

export let getTrait = SlateTool.create(spec, {
  name: 'Get Trait',
  key: 'get_trait',
  description: `Get detailed information about a specific trait, including its possible values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      traitName: z.string().describe('Name of the trait to retrieve')
    })
  )
  .output(traitSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let trait = await client.getTrait(ctx.input.traitName);

    return {
      output: {
        traitId: trait.id,
        name: trait.name,
        values: (trait.values ?? []).map((v: Record<string, unknown>) => ({
          value: v.value,
          traitValueId: v.id
        }))
      },
      message: `Retrieved trait **${trait.name}** with ${(trait.values ?? []).length} value(s).`
    };
  })
  .build();

export let createTrait = SlateTool.create(spec, {
  name: 'Create Trait',
  key: 'create_trait',
  description: `Create a new trait in the Wit.ai app with initial values. Traits are sentence-level classifiers such as sentiment, greeting detection, or custom categories.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new trait'),
      values: z.array(z.string()).describe('Initial possible values for the trait')
    })
  )
  .output(traitSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let trait = await client.createTrait(ctx.input.name, ctx.input.values);

    return {
      output: {
        traitId: trait.id,
        name: trait.name,
        values: (trait.values ?? []).map((v: Record<string, unknown>) => ({
          value: v.value as string,
          traitValueId: v.id as string | undefined
        }))
      },
      message: `Created trait **${trait.name}** with values: ${ctx.input.values.join(', ')}.`
    };
  })
  .build();

export let deleteTrait = SlateTool.create(spec, {
  name: 'Delete Trait',
  key: 'delete_trait',
  description: `Permanently delete a trait from the Wit.ai app. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      traitName: z.string().describe('Name of the trait to delete')
    })
  )
  .output(
    z.object({
      deleted: z.string().describe('Name of the deleted trait')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    await client.deleteTrait(ctx.input.traitName);

    return {
      output: {
        deleted: ctx.input.traitName
      },
      message: `Deleted trait **${ctx.input.traitName}**.`
    };
  })
  .build();

export let manageTraitValues = SlateTool.create(spec, {
  name: 'Manage Trait Values',
  key: 'manage_trait_values',
  description: `Add or remove possible values for an existing trait.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      traitName: z.string().describe('Name of the trait'),
      action: z.enum(['add', 'delete']).describe('Whether to add or delete a value'),
      value: z.string().describe('The trait value to add or remove')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.action === 'add') {
      await client.addTraitValue(ctx.input.traitName, ctx.input.value);
    } else {
      await client.deleteTraitValue(ctx.input.traitName, ctx.input.value);
    }

    return {
      output: { success: true },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Deleted'} value **${ctx.input.value}** ${ctx.input.action === 'add' ? 'to' : 'from'} trait **${ctx.input.traitName}**.`
    };
  })
  .build();
