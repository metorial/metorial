import PQueueImport from 'p-queue';
import { resolveDefaultExport } from '../module/resolveDefaultExport';

export let PQueue = resolveDefaultExport<typeof PQueueImport>(PQueueImport);
