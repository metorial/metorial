import { z } from 'zod';
import { authorSchema } from '../channels/author';
import { channelSchema } from '../channels/channel';
import { threadSchema } from '../channels/thread';
import { messageSchema } from '../content/message';
import { rawSchema } from '../shared/raw';

export let commandOptionTypeSchema = z.enum([
  'string',
  'integer',
  'boolean',
  'number',
  'user',
  'channel',
  'role',
  'mentionable',
  'attachment',
  'subcommand',
  'subcommand_group',
  'unknown'
]);

export type CommandOptionType = z.infer<typeof commandOptionTypeSchema>;

export let commandChoiceSchema = z.object({
  name: z.string(),
  value: z.string()
});

export type CommandChoice = z.infer<typeof commandChoiceSchema>;

export type CommandOptionDefinition = {
  name: string;
  description?: string;
  type?: CommandOptionType;
  required?: boolean;
  choices?: CommandChoice[];
  options?: CommandOptionDefinition[];
};

export let commandOptionDefinitionSchema: z.ZodType<CommandOptionDefinition> = z.lazy(() =>
  z.object({
    name: z.string(),
    description: z.string().optional(),
    type: commandOptionTypeSchema.optional(),
    required: z.boolean().optional(),
    choices: z.array(commandChoiceSchema).optional(),
    options: z.array(commandOptionDefinitionSchema).optional()
  })
);

export let commandSchema = z.object({
  name: z.string().describe('Command name without a leading slash, e.g. weather'),
  description: z.string().optional(),
  usage: z.string().optional().describe('Hint shown in the composer, e.g. [zip code]'),
  commandId: z.string().optional().describe('Provider id when the platform assigns one'),
  options: z.array(commandOptionDefinitionSchema).optional(),
  raw: rawSchema
});

export type Command = z.infer<typeof commandSchema>;

export let commandOptionValueSchema = z.object({
  name: z.string(),
  value: z.string().optional(),
  type: commandOptionTypeSchema.optional()
});

export type CommandOptionValue = z.infer<typeof commandOptionValueSchema>;

export let commandInvokedSchema = z.object({
  name: z.string().describe('Command name without a leading slash'),
  commandId: z.string().optional(),
  text: z
    .string()
    .optional()
    .describe('Freeform arguments after the command. Slack, Teams, and Google Chat use this.'),
  subcommand: z.string().optional(),
  subcommandGroup: z.string().optional(),
  options: z
    .array(commandOptionValueSchema)
    .optional()
    .describe('Structured options when the platform provides them, e.g. Discord'),
  author: authorSchema,
  channelId: z.string(),
  threadId: z.string().optional(),
  triggerId: z
    .string()
    .optional()
    .describe('Pass to chat.modal.open when the user should see a modal'),
  responseToken: z
    .string()
    .optional()
    .describe('Pass to chat.command.respond for a delayed or interaction callback reply'),
  message: messageSchema.optional(),
  channel: channelSchema.optional(),
  thread: threadSchema.optional(),
  raw: rawSchema
});

export type CommandInvoked = z.infer<typeof commandInvokedSchema>;

export let commandAutocompleteSchema = z.object({
  name: z.string(),
  commandId: z.string().optional(),
  subcommand: z.string().optional(),
  subcommandGroup: z.string().optional(),
  optionName: z.string().describe('Name of the option currently being typed'),
  query: z.string().describe('Partial value of the focused option'),
  options: z.array(commandOptionValueSchema).optional(),
  author: authorSchema.optional(),
  channelId: z.string().optional(),
  responseToken: z.string().optional(),
  raw: rawSchema
});

export type CommandAutocomplete = z.infer<typeof commandAutocompleteSchema>;
