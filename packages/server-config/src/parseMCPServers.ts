import { parse } from 'partial-json';

export let parseMCPServers = (config: string) => {
  try {
    let data = tryParseJson(config);
    // let server = Object.values(data)[0];

    let server: {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    } = data;

    while (typeof server == 'object' && typeof server.command != 'string') {
      server = Object.values(server)[0] as any;
    }

    if (typeof server != 'object')
      throw new Error(`Invalid server config: ${JSON.stringify(config, null, 2)}`);

    let argParser = argParsers.find(p => p.commands.some(cmd => cmd(server.command)));
    if (!argParser) throw new Error(`Unknown command: ${server.command}`);

    let args = argParser.parser(server.args || []) ?? [];

    return {
      cliArguments: {
        template: args.join(' '),
        keys: args.filter(looksLikeConfigKey).map(key => ({ key }))
      },
      environmentVariables: Object.entries(server.env || {}).map(([key, value]) => ({
        key
      }))
    };
  } catch (e) {
    console.error(e);
    return null;
  }
};

let pathCommand = (a: string) => (b: string) => a === b || b.endsWith(`/${a}`);

let looksLikeConfigKey = (arg: string) => /^[A-Z][A-Z0-9_]*$/.test(arg);

let optionTakesValue = (arg: string, valueOptions: Set<string>) => {
  if (!arg.startsWith('-')) return false;
  if (arg.includes('=')) return false;

  return valueOptions.has(arg);
};

let argsAfterEntrypoint = (
  args: string[],
  opts?: {
    valueOptions?: string[];
    stopAtDoubleDash?: boolean;
  }
) => {
  let valueOptions = new Set(opts?.valueOptions ?? []);

  for (let i = 0; i < args.length; i++) {
    let arg = args[i];

    if (opts?.stopAtDoubleDash && arg == '--') {
      return args.slice(i + 1);
    }

    if (arg.startsWith('-')) {
      if (optionTakesValue(arg, valueOptions)) i++;
      continue;
    }

    return args.slice(i + 1);
  }
};

let NODE_RUNNER_VALUE_OPTIONS = [
  '--cache',
  '--cache-dir',
  '--cwd',
  '--directory',
  '--env-file',
  '--loader',
  '--prefix',
  '--require',
  '--title',
  '-C',
  '-e',
  '-r'
];

let PACKAGE_RUNNER_VALUE_OPTIONS = [
  ...NODE_RUNNER_VALUE_OPTIONS,
  '--from',
  '--package',
  '--registry',
  '--tag',
  '--with',
  '--with-editable',
  '--with-requirements',
  '--python',
  '--index-url',
  '--extra-index-url',
  '--find-links',
  '--resolution',
  '--prerelease',
  '--fork-strategy',
  '--link-mode',
  '--exclude-newer',
  '--refresh-package',
  '-p'
];

let UV_RUN_VALUE_OPTIONS = [
  ...PACKAGE_RUNNER_VALUE_OPTIONS,
  '--active',
  '--directory',
  '--env-file',
  '--extra',
  '--group',
  '--isolated',
  '--module',
  '--project',
  '--script',
  '--with-requirements',
  '-m'
];

let argParsers = [
  {
    commands: [
      pathCommand('uvx'),
      pathCommand('npx'),
      pathCommand('bunx')
    ],
    parser: (args: string[]) => {
      return argsAfterEntrypoint(args, {
        valueOptions: PACKAGE_RUNNER_VALUE_OPTIONS,
        stopAtDoubleDash: true
      });
    }
  },

  {
    commands: [
      pathCommand('python'),
      pathCommand('python3'),
      pathCommand('node'),
      pathCommand('ts-node'),
      pathCommand('bun')
    ],
    parser: (args: string[]) => {
      return argsAfterEntrypoint(args, {
        valueOptions: NODE_RUNNER_VALUE_OPTIONS,
        stopAtDoubleDash: true
      });
    }
  },

  {
    commands: [pathCommand('uv')],
    parser: (args: string[]) => {
      for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        if (arg == '-m' || arg == '--module') {
          return args.slice(i + 2);
        }
      }

      for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        if (arg == 'run') {
          return argsAfterEntrypoint(args.slice(i + 1), {
            valueOptions: UV_RUN_VALUE_OPTIONS,
            stopAtDoubleDash: true
          });
        }
      }
    }
  }
];

let tryParseJson = (str: string) => {
  try {
    return JSON.parse(str);
  } catch (e) {}

  try {
    return JSON.parse(`{${str}}`);
  } catch (e) {}

  try {
    return JSON.parse(`{${str}`);
  } catch (e) {}

  try {
    return JSON.parse(`${str}}`);
  } catch (e) {}

  let lines = str.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    let current = lines.slice(0, i + 1).join('\n');
    try {
      return JSON.parse(current);
    } catch (e) {}
  }

  for (let i = 0; i < lines.length; i++) {
    let current = lines.slice(i).join('\n');
    try {
      return JSON.parse(current);
    } catch (e) {}
  }

  try {
    return parse(str);
  } catch (e) {}

  throw new Error(`Failed to parse JSON: ${str}`);
};
