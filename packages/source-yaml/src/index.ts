const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const slugify = require('@sindresorhus/slugify');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const tob64 = (str: string) => Buffer.from(str).toString('base64');
const fromb64 = (str: string) => Buffer.from(str, 'base64').toString();

/**
 *
 * globals, we may have to make per-invocation in future
 *
 */

export let defaultRecognizedExtensions = ['.yml', '.yaml'];

type PluginOpts = {
  dirPath: string;
  recognizedExtensions?: string[];
};
type SSGYamlPluginFile = {
  uid: string;
  createdAt: Date;
  modifiedAt: Date;
  metadata: any;
  file: string;
  filePath: string;
  data?: any;
};
export default function SSGYamlPlugin(opts: PluginOpts) {
  if (typeof opts.dirPath === 'undefined')
    throw new Error('dirPath not supplied to ssg yaml plugin');
  let recognizedExtensions =
    opts.recognizedExtensions || defaultRecognizedExtensions;

  async function createIndex(/* we could take mainIndex but we dont really use it here */) {
    const arrs = await crawlDirectory(opts.dirPath); // calls the recursive crawl function below
    const strArr = [] as SSGYamlPluginFile[];
    let fileArr = strArr.concat
      .apply([], arrs) // ghetto flatten
      .filter(Boolean);
    let index = {};
    fileArr.forEach(obj => {
      const { filePath } = obj;
      const baseName = slugify(filePath);
      obj.data = yaml.safeLoad(fs.readFileSync(filePath, 'utf-8'));
      index[baseName] = obj;
    });
    return index;
  }

  // flattens all directories below the dirPath
  // is recursive!
  async function crawlDirectory(recursiveDir: string) {
    const files = await readdir(recursiveDir);
    const getStats = async (file: string, _dirPath: string) => {
      const filePath = path.join(_dirPath, file);
      const st = await stat(filePath);
      if (st.isDirectory()) {
        const temp = await crawlDirectory(filePath); // recursion
        return Object.values(temp); // take it back out of an object into an array
      } else {
        if (file === '.DS_Store') return; // skip ds store... TODO have a skipFiles list
        if (!recognizedExtensions.includes(path.extname(file))) return; // skip
        return [
          {
            file,
            filePath,
            uid: tob64(filePath),
            createdAt: st.birthtime,
            modifiedAt: st.mtime
          }
        ];
      }
    };
    const arrs: SSGYamlPluginFile[][] = await Promise.all(
      files.map((file: string) => getStats(file, recursiveDir))
    );
    return arrs;
  }

  async function getDataSlice(uid: string) {
    const filepath = fromb64(uid);
    const data = yaml.safeLoad(fs.readFileSync(filepath), 'utf-8');
    return data;
  }

  return {
    createIndex,
    getDataSlice
  };
}
