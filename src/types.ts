export type AuthConfig =
  | {
      userId: string;
      appId: string;
      pat: string;
      rootCertificatesPath?: string;
      token?: string;
      base?: string;
      ui?: string;
    }
  | Record<string, never>;
