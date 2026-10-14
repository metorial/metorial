import { z } from 'zod';

export let scheduleIdSchema = z
  .string()
  .describe('Schedule ID. Call list_schedules to discover available schedules.');
