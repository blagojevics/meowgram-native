declare module "expo-file-system" {
  export enum EncodingType {
    UTF8 = "utf8",
    Base64 = "base64",
  }

  export interface FileSystemOptions {
    [key: string]: any;
    encoding?: EncodingType | string;
  }

  export interface DownloadResult {
    uri: string;
    status: number;
    headers: Record<string, string>;
    md5?: string;
  }

  export interface UploadResult {
    body: string;
    headers: Record<string, string>;
    status: number;
  }

  export interface FileInfo {
    exists: boolean;
    isDirectory: boolean;
    modificationTime?: number;
    size?: number;
    uri: string;
  }

  export const documentDirectory: string;
  export const cacheDirectory: string;
  export const temporaryDirectory: string;
  export const readAsStringAsync: (
    fileUri: string,
    options?: FileSystemOptions
  ) => Promise<string>;
  export const writeAsStringAsync: (
    fileUri: string,
    contents: string,
    options?: FileSystemOptions
  ) => Promise<void>;
  export const deleteAsync: (
    fileUri: string,
    options?: FileSystemOptions
  ) => Promise<void>;
  export const moveAsync: (options: {
    from: string;
    to: string;
  }) => Promise<void>;
  export const copyAsync: (options: {
    from: string;
    to: string;
  }) => Promise<void>;
  export const makeDirectoryAsync: (
    fileUri: string,
    options?: FileSystemOptions
  ) => Promise<void>;
  export const getInfoAsync: (
    fileUri: string,
    options?: FileSystemOptions
  ) => Promise<FileInfo>;
  export const downloadAsync: (
    uri: string,
    fileUri: string,
    options?: FileSystemOptions
  ) => Promise<DownloadResult>;
}
