import { toolCategory } from 'slates';
import { contract, generatedToolsByCategory } from './lib/contractTools';
import { filesUpload } from './tools';

export let toolCategories = contract.categories.map(category =>
  toolCategory({
    key: category.key,
    name: category.name,
    description: category.description,
    tools: [
      ...generatedToolsByCategory(category.key),
      ...(category.key === 'files' ? [filesUpload] : [])
    ]
  })
);
