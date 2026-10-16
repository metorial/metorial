import { SlateTool } from 'slates';
import { z } from 'zod';
import { LibrariesClient } from '../lib/libraries';
import { spec } from '../spec';

export let getLibrary = SlateTool.create(spec, {
  key: 'get_library',
  name: 'Get Library',
  description:
    'Retrieve a Creative Cloud Library and its metadata. Use list_libraries to discover library IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ libraryId: z.string().describe('Library ID from list_libraries') }))
  .output(
    z.object({ library: z.any().describe('Complete library metadata returned by Adobe') })
  )
  .handleInvocation(async ctx => {
    let library = await new LibrariesClient(ctx.auth).getLibrary(ctx.input.libraryId);
    return { output: { library }, message: 'Retrieved Creative Cloud Library metadata.' };
  })
  .build();

export let getLibraryElement = SlateTool.create(spec, {
  key: 'get_library_element',
  name: 'Get Library Element',
  description:
    'Retrieve a library element including its representations and renditions. Use list_library_elements to discover element IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      libraryId: z.string().describe('Library ID from list_libraries'),
      elementId: z.string().describe('Element ID from list_library_elements')
    })
  )
  .output(
    z.object({ element: z.any().describe('Complete element metadata returned by Adobe') })
  )
  .handleInvocation(async ctx => {
    let element = await new LibrariesClient(ctx.auth).getElement(
      ctx.input.libraryId,
      ctx.input.elementId
    );
    return {
      output: { element },
      message: 'Retrieved Creative Cloud Library element metadata.'
    };
  })
  .build();
