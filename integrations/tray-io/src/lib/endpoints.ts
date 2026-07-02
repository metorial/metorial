export let getGraphqlUrl = (region: string): string => {
  switch (region) {
    case 'eu':
      return 'https://eu1.tray.io/graphql';
    case 'apac':
      return 'https://ap1.tray.io/graphql';
    default:
      return 'https://tray.io/graphql';
  }
};

export let getRestBaseUrl = (region: string): string => {
  switch (region) {
    case 'eu':
      return 'https://api.eu1.tray.io';
    case 'apac':
      return 'https://api.ap1.tray.io';
    default:
      return 'https://api.tray.io';
  }
};
