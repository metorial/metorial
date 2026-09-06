import { input } from '@inquirer/prompts';
import { print } from '../lib/prompts';
import type { WithProfile } from '../lib/types';
import { listAuth, setupAuth } from './auth';
import { getConfig, setConfig } from './config';
import { getProfile } from './profiles';
import { callTool, getTool, listTools } from './tools';
import {
  getTrigger,
  getTriggerGroup,
  listTriggerGroups,
  listTriggers,
  pollTriggerGroup
} from './triggers';

let printHelp = () => {
  console.log(
    [
      'Available commands:',
      '  help',
      '  tools',
      '  tool <toolId>',
      '  call <toolId>',
      '  triggers',
      '  trigger <triggerId>',
      '  trigger-groups',
      '  trigger-group <triggerGroupId>',
      '  poll <triggerGroupId>',
      '  auth list',
      '  auth setup [authMethodId]',
      '  config get',
      '  config set',
      '  profile',
      '  quit'
    ].join('\n')
  );
};

export let startRepl = async (opts: WithProfile) => {
  let keepRunning = true;
  printHelp();

  while (keepRunning) {
    let commandLine = await input({
      message: 'slates>'
    });
    let [command, ...rest] = commandLine.trim().split(/\s+/).filter(Boolean);

    if (!command) continue;

    switch (command) {
      case 'exit':
      case 'quit':
        keepRunning = false;
        break;

      case 'help':
        printHelp();
        break;

      case 'tools':
        print(await listTools(opts));
        break;

      case 'tool':
        print(await getTool({ ...opts, toolId: rest[0] }));
        break;

      case 'call':
        print(await callTool({ ...opts, toolId: rest[0] }));
        break;

      case 'triggers':
        print(await listTriggers(opts));
        break;

      case 'trigger':
        print(await getTrigger({ ...opts, triggerId: rest[0] }));
        break;

      case 'trigger-groups':
        print(await listTriggerGroups(opts));
        break;

      case 'trigger-group':
        print(await getTriggerGroup({ ...opts, triggerGroupId: rest[0] }));
        break;

      case 'poll':
        print(await pollTriggerGroup({ ...opts, triggerGroupId: rest[0] }));
        break;

      case 'auth':
        if (rest[0] === 'list') {
          print(await listAuth(opts));
          break;
        }

        if (rest[0] === 'setup') {
          print(await setupAuth({ ...opts, authMethodId: rest[1] }));
          break;
        }

        throw new Error(`Unsupported auth command: ${rest.join(' ')}`);

      case 'config':
        if (rest[0] === 'get') {
          print(await getConfig(opts));
          break;
        }

        if (rest[0] === 'set') {
          print(await setConfig(opts));
          break;
        }

        throw new Error(`Unsupported config command: ${rest.join(' ')}`);

      case 'profile':
        print(await getProfile(opts));
        break;

      default:
        throw new Error(`Unknown REPL command: ${command}`);
    }
  }
};
