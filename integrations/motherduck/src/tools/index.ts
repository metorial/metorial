import { motherDuckToolContracts } from './contracts';
import { createMotherDuckTool } from './factory';

export let motherDuckTools = motherDuckToolContracts.map(createMotherDuckTool);
