var unified = require('unified');
var vfile = require('to-vfile');
var report = require('vfile-reporter');
const { produce } = require('immer');
const slugify = require('@sindresorhus/slugify');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const frontMatter = require('front-matter');

/**
 *
 * globals, we may have to make per-invocation in future
 *
 */

let _recognizedExtensions = ['.md', '.markdown', '.mdx', '.svexy'];
let _preset = {
  settings: {},
  plugins: [
    require('remark-parse'),
    require('remark-slug'),
    [
      require('remark-autolink-headings'),
      {
        behavior: 'append',
        content: {
          type: 'element',
          tagName: 'span',
          properties: { className: ['icon', 'icon-link'] },
          children: [{ type: 'text', value: ' 🔗' }]
        }
      }
    ],
    require('remark-toc'),
    require('remark-sectionize'),
    require('remark-rehype'),
    require('rehype-format'),
    [require('remark-frontmatter'), ['yaml']],
    [require('rehype-shiki'), { theme: 'Material-Theme-Palenight' }],
    require('rehype-stringify')
  ]
};

export type PluginOpts = {
  dirPath?: string;
  dateFilterType?: 'all' | 'current';
  modifyRecognizedExtensions?: string;
  modifyRemarkConfig?: string;
  ignoreGlobs?: string[];
  // onCreateIndex?: (index: {
  //     [slug: string]: SSGRemarkPluginFile;
  // }) => Promise<void>
};
type SSGRemarkPluginFile = {
  slug: string;
  filePath: string;
  createdAt: Date;
  modifiedAt: Date;
  metadata: any;
};
export default function(opts?: PluginOpts) {
  if (opts === null || opts === undefined) opts = {};
  let startDirPath = opts.dirPath || path.resolve('.');
  if (opts.modifyRecognizedExtensions) {
    _recognizedExtensions = produce(
      _recognizedExtensions,
      opts.modifyRecognizedExtensions
    );
  }
  if (opts.modifyRemarkConfig) {
    _preset = produce(_preset, opts.modifyRemarkConfig);
  }

  let index: SSGRemarkPluginFile[];
  // flattens all directories below the dirPath
  // is recursive!
  async function createIndex(recursiveDir = startDirPath) {
    const files = await readdir(recursiveDir);
    const getStats = async (file: string, dirPath: string) => {
      const filePath = path.join(dirPath, file);
      let shortFilePath = path.parse(path.relative(startDirPath, filePath));
      shortFilePath = shortFilePath.dir + '/' + shortFilePath.name; // drop the extension, could be '.md' but also anything else
      const st = await stat(filePath);
      if (st.isDirectory()) {
        if ((file = 'node_modules')) return; // dont go inside node_modules
        // TODO: take an ignore glob and default to node_modules
        return await createIndex(filePath); // recursion
      } else {
        if (file === '.DS_Store') return; // skip ds store...
        if (!_recognizedExtensions.includes(path.extname(file))) return; // skip
        const temp = fs.readFileSync(filePath, 'utf-8');
        const { attributes: metadata } = frontMatter(temp);
        if (metadata.published === false) return; // dont show if published is false
        let pubdate = metadata.date || st.birthtime;
        metadata.pubdate = pubdate;
        metadata.date = new Date(pubdate);
        const slug =
          metadata.slug || metadata.permalink || slugify(shortFilePath);
        return [
          {
            slug,
            filePath: shortFilePath,
            createdAt: st.birthtime,
            modifiedAt: st.mtime,
            metadata
          }
        ] as SSGRemarkPluginFile[];
      }
    };
    const promises: Promise<SSGRemarkPluginFile[]>[] = files.map(
      (file: string) => getStats(file, recursiveDir)
    );
    const arrs: (SSGRemarkPluginFile[])[] = await Promise.all(promises);
    const strArr = [] as SSGRemarkPluginFile[];
    index = strArr.concat.apply([], arrs); // ghetto flatten
    index = index
      .filter(Boolean)
      .filter(notEmpty)
      .sort((a, b) => {
        return a!.metadata.pubdate < b!.metadata.pubdate ? 1 : -1;
      });
    // .filter(x =>
    //   opts.dateFilterType === 'all'
    //     ? true
    //     : new Date(x!.metadata.date) <= new Date()
    // );
    // const result = extractSlugObjectFromArray(index);
    const result = index;
    // // i dont really use this yet
    // if (opts.onCreateIndex) {
    //   await opts.onCreateIndex(result) // optional logging
    // }
    return result;
  }

  // https://stackoverflow.com/questions/43118692/typescript-filter-out-nulls-from-an-array
  function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
    return value !== null && value !== undefined;
  }

  async function getDataSlice(slug: string) {
    let filepath = index.find(item => item.slug === slug);
    if (filepath) {
      const md = vfile.readSync(filepath.filePath);
      const file = await unified()
        .use(_preset)
        .process(md)
        .catch((err: Error) => {
          console.error(report(md));
          throw err;
        });
      file.extname = '.html';
      return file.toString();
    } else {
      throw new Error('no file for ' + slug + ' found');
    }
  }

  return {
    createIndex,
    getDataSlice
  };
}

// function extractSlugObjectFromArray(arr: SSGRemarkPluginFile[]) {
//   let obj = {} as { [slug: string]: SSGRemarkPluginFile };
//   arr.forEach(item => (obj[item.metadata.slug] = item));
//   return obj;
// }
