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

export type Subset<K> = {
  [attr in keyof K]?: K[attr] extends object
    ? Subset<K[attr]>
    : K[attr] extends object | null
      ? Subset<K[attr]> | null
      : K[attr] extends object | null | undefined
        ? Subset<K[attr]> | null | undefined
        : K[attr];
};
