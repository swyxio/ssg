declare var unified: any;
declare var vfile: any;
declare var report: any;
declare const produce: any;
declare const promisify: any;
declare const fs: any;
declare const path: any;
declare const readdir: any;
declare const stat: any;
declare const lstat: any;
declare const frontMatter: any;
declare const tob64: (str: string) => string;
declare const fromb64: (str: string) => string;
/**
 *
 * globals, we may have to make per-invocation in future
 *
 */
declare let _recognizedExtensions: string[];
declare let _preset: {
    settings: {};
    plugins: any[];
};
declare type PluginOpts = {
    dirPath: string;
    filterType: 'all' | 'current' | undefined;
    modifyRecognizedExtensions?: string;
    modifyRemarkConfig?: string;
};
declare type SSGRemarkPluginFile = {
    uid: string;
    createdAt: Date;
    modifiedAt: Date;
    metadata: any;
};
declare function extractSlugObjectFromArray(arr: SSGRemarkPluginFile[]): {
    [slug: string]: SSGRemarkPluginFile;
};
