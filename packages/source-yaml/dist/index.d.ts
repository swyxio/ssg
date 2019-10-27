/**
 *
 * globals, we may have to make per-invocation in future
 *
 */
export declare let defaultRecognizedExtensions: string[];
declare type PluginOpts = {
    dirPath: string;
    recognizedExtensions?: string[];
};
export default function SSGYamlPlugin(opts: PluginOpts): {
    createIndex: (recursiveDir?: string) => Promise<{}>;
    getDataSlice: (uid: string) => Promise<any>;
};
export {};
