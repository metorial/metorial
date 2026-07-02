import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

let printlistCreationSchema = z.object({
  identifier: z.string().describe('Creation identifier'),
  name: z.string().nullable().describe('Creation name'),
  shortUrl: z.string().nullable().describe('Short URL'),
  illustrationImageUrl: z.string().nullable().describe('Cover image URL')
});

let printlistSchema = z.object({
  printlistId: z.string().describe('Printlist ID'),
  url: z.string().nullable().describe('Printlist URL'),
  name: z.string().nullable().describe('Printlist name'),
  isPublic: z.boolean().nullable().describe('Whether the printlist is public'),
  position: z.number().nullable().describe('Display position'),
  totalCreations: z.number().nullable().describe('Total creations in the printlist'),
  creations: z.array(printlistCreationSchema).describe('Creations in the printlist')
});

export let getMyPrintlists = SlateTool.create(spec, {
  name: 'Get My Printlists',
  key: 'get_my_printlists',
  description: `List your Cults3D printlists (collections) with their contents. Returns printlist names, visibility, and the creations saved in each.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of printlists (default 20)'),
      offset: z.number().min(0).optional().describe('Number of printlists to skip')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of printlists'),
      printlists: z.array(printlistSchema).describe('Your printlists')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.getMyPrintlists({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let printlists = result.results.map((p: any) => ({
      printlistId: p.id,
      url: p.url,
      name: p.name,
      isPublic: p.public,
      position: p.position,
      totalCreations: p.creationsBatch?.total ?? null,
      creations: (p.creationsBatch?.results ?? []).map((c: any) => ({
        identifier: c.identifier,
        name: c.name,
        shortUrl: c.shortUrl,
        illustrationImageUrl: c.illustrationImageUrl
      }))
    }));

    return {
      output: {
        total: result.total,
        printlists
      },
      message: `Found **${result.total}** printlists. Returned ${printlists.length} results.`
    };
  })
  .build();

export let createPrintlist = SlateTool.create(spec, {
  name: 'Create Printlist',
  key: 'create_printlist',
  description: `Create a new printlist (collection) on Cults3D. Optionally set it as public or private.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new printlist'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the printlist should be public (default varies by account)')
    })
  )
  .output(
    z.object({
      printlistId: z.string().describe('ID of the new printlist'),
      url: z.string().nullable().describe('URL of the printlist'),
      name: z.string().nullable().describe('Name of the printlist'),
      isPublic: z.boolean().nullable().describe('Public visibility')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let printlist = await client.createPrintlist({
      name: ctx.input.name,
      isPublic: ctx.input.isPublic
    });

    return {
      output: {
        printlistId: printlist.id,
        url: printlist.url,
        name: printlist.name,
        isPublic: printlist.public
      },
      message: `Created printlist **${printlist.name ?? ctx.input.name}**.`
    };
  })
  .build();

export let updatePrintlist = SlateTool.create(spec, {
  name: 'Update Printlist',
  key: 'update_printlist',
  description: `Update the name or visibility of an existing printlist on Cults3D.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      printlistId: z.string().describe('ID of the printlist to update'),
      name: z.string().optional().describe('New name'),
      isPublic: z.boolean().optional().describe('New public visibility setting')
    })
  )
  .output(
    z.object({
      printlistId: z.string().describe('ID of the printlist'),
      url: z.string().nullable().describe('URL of the printlist'),
      name: z.string().nullable().describe('Updated name'),
      isPublic: z.boolean().nullable().describe('Public visibility')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let printlist = await client.updatePrintlist({
      printlistId: ctx.input.printlistId,
      name: ctx.input.name,
      isPublic: ctx.input.isPublic
    });

    return {
      output: {
        printlistId: printlist.id,
        url: printlist.url,
        name: printlist.name,
        isPublic: printlist.public
      },
      message: `Updated printlist **${printlist.name}**.`
    };
  })
  .build();

export let deletePrintlist = SlateTool.create(spec, {
  name: 'Delete Printlist',
  key: 'delete_printlist',
  description: `Permanently delete a printlist (collection) from Cults3D. This does not delete the creations in the printlist.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      printlistId: z.string().describe('ID of the printlist to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the printlist was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    await client.destroyPrintlist(ctx.input.printlistId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted printlist ${ctx.input.printlistId}.`
    };
  })
  .build();

export let addCreationToPrintlist = SlateTool.create(spec, {
  name: 'Add to Printlist',
  key: 'add_to_printlist',
  description: `Add a creation to an existing printlist on Cults3D.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      creationId: z.string().describe('ID of the creation to add'),
      printlistId: z.string().describe('ID of the target printlist')
    })
  )
  .output(
    z.object({
      added: z.boolean().describe('Whether the creation was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    await client.addCreationToPrintlist({
      creationId: ctx.input.creationId,
      printlistId: ctx.input.printlistId
    });

    return {
      output: {
        added: true
      },
      message: `Added creation ${ctx.input.creationId} to printlist ${ctx.input.printlistId}.`
    };
  })
  .build();

export let removeCreationFromPrintlist = SlateTool.create(spec, {
  name: 'Remove from Printlist',
  key: 'remove_from_printlist',
  description: `Remove a creation from a printlist on Cults3D. The creation itself is not deleted.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      creationId: z.string().describe('ID of the creation to remove'),
      printlistId: z.string().describe('ID of the printlist')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the creation was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    await client.removeCreationFromPrintlist({
      creationId: ctx.input.creationId,
      printlistId: ctx.input.printlistId
    });

    return {
      output: {
        removed: true
      },
      message: `Removed creation ${ctx.input.creationId} from printlist ${ctx.input.printlistId}.`
    };
  })
  .build();
