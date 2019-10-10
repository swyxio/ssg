declare const yaml: any;
declare const fs: any;
declare const path: any;
declare const promisify: any;
declare const readdir: any;
declare const stat: any;
declare const tob64: (str: string) => string;
declare const fromb64: (str: string) => string;
/**
 *
 * globals, we may have to make per-invocation in future
 *
 */
declare let defaultRecognizedExtensions: string[];
declare type PluginOpts = {
    dirPath: string;
    recognizedExtensions?: string[];
};
declare type SSGYamlPluginFile = {
    uid: string;
    createdAt: Date;
    modifiedAt: Date;
    metadata: any;
};
