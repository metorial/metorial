import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUserInfoTool = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Verify the Coda API token and retrieve limited account information for the authenticated user.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      loginId: z.string().optional().describe('Login ID for the authenticated user'),
      name: z.string().optional().describe('Name of the authenticated user'),
      email: z.string().optional().describe('Email of the authenticated user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.whoami();

    return {
      output: {
        loginId: user.loginId,
        name: user.name,
        email: user.loginId
      },
      message: `Authenticated as **${user.name || user.loginId}**.`
    };
  })
  .build();

export let listDocCategoriesTool = SlateTool.create(spec, {
  name: 'List Doc Categories',
  key: 'list_doc_categories',
  description: `List Coda doc categories that can be used when publishing docs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      categories: z.array(
        z.object({
          name: z.string().describe('Category name'),
          categoryId: z.string().optional().describe('Category ID when returned by Coda')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCategories();
    let rawCategories = result.categories || result.items || [];
    let categories = rawCategories.map((category: any) => ({
      name: category.name,
      categoryId: category.id
    }));

    return {
      output: {
        categories
      },
      message: `Found **${categories.length}** doc categor${categories.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();
