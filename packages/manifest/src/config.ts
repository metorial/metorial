import { Cases } from '@metorial-mcp-containers/case';

export interface ConfigValue {
  title: string;
  description: string | null;
  default: string | null;
  required: boolean;

  fields: ConfigValueField[];
}

export interface ConfigValueField {
  type: 'environment' | 'cli' | 'file';
  key: string;
}

export let buildConfig = (d: {
  cliArguments:
  | {
    template: string;
    keys: {
      key: string;
      required?: boolean;
    }[];
  }
  | {
    arguments: {
      key: string;
      required?: boolean;
    }[];
  }
  | null;
  environmentVariables:
  | {
    key: string;
    required?: boolean;
    environmentVariable?: string;
  }[]
  | null;
  files: string[];
}) => {
  let configs = new Map<string, ConfigValue>();
  let argumentsTemplate: string | null = null;

  for (let file of d.files) {
    configs.set(file, {
      title: file,
      description: null,
      default: null,
      required: true,
      fields: [
        {
          type: 'file',
          key: file
        }
      ]
    });
  }

  let getConfigValue = (key: string, opts?: { required?: boolean }) => {
    let normalizedKey = Cases.toKebabCase(key);

    let configValue = configs.get(normalizedKey);
    if (!configValue) {
      throw new Error(`Unknown config key: ${key}`);
    }

    return [normalizedKey, configValue] as const;
  };

  if (d.environmentVariables) {
    for (let envVar of d.environmentVariables) {
      let [normalizedKey, configValue] = getConfigValue(envVar.key, envVar);

      configValue.fields.push({
        type: 'environment',
        key: envVar.environmentVariable ?? envVar.key
      });

      configs.set(normalizedKey, configValue);
    }
  }

  if (d.cliArguments) {
    if ('template' in d.cliArguments) {
      argumentsTemplate = d.cliArguments.template;

      for (let cliArg of d.cliArguments.keys) {
        let [normalizedKey, configValue] = getConfigValue(cliArg.key.replace(/--/g, ''));

        configValue.fields.push({
          type: 'cli',
          key: cliArg.key
        });

        configs.set(normalizedKey, configValue);
      }
    } else {
      for (let cliArg of d.cliArguments.arguments) {
        let [normalizedKey, configValue] = getConfigValue(cliArg.key.replace(/--/g, ''));

        configValue.fields.push({
          type: 'cli',
          key: cliArg.key
        });

        configs.set(normalizedKey, configValue);
      }
    }
  }

  return {
    argumentsTemplate,
    configValues: [...configs.values()]
  };
};
