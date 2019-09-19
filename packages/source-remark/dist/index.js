"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var unified = require('unified');
// var stream = require('unified-stream')
var vfile = require('to-vfile');
var report = require('vfile-reporter');
const { produce } = require('immer');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const lstat = promisify(fs.lstat);
const frontMatter = require('front-matter');
const tob64 = (str) => Buffer.from(str).toString('base64');
const fromb64 = (str) => Buffer.from(str, 'base64').toString();
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
        require('remark-toc'),
        require('remark-sectionize'),
        require('remark-slug'),
        [require('remark-autolink-headings'), { behavior: 'wrap' }],
        require('remark-rehype'),
        require('rehype-format'),
        [require('remark-frontmatter'), ['yaml']],
        [require('rehype-shiki'), { theme: 'Material-Theme-Palenight' }],
        require('rehype-stringify'),
    ],
};
module.exports = function (opts) {
    if (!opts.dirPath)
        throw new Error('dirpath not supplied to remark plugin');
    if (opts.modifyRecognizedExtensions) {
        _recognizedExtensions = produce(_recognizedExtensions, opts.modifyRecognizedExtensions);
    }
    if (opts.modifyRemarkConfig) {
        _preset = produce(_preset, opts.modifyRemarkConfig);
    }
    // flattens all directories below the dirPath
    function createIndex(recursiveDir = opts.dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield readdir(recursiveDir);
            const getStats = (file, _dirPath) => __awaiter(this, void 0, void 0, function* () {
                const filePath = path.join(_dirPath, file);
                const st = yield stat(filePath);
                if (st.isDirectory()) {
                    return yield createIndex(filePath);
                }
                else {
                    if (file === '.DS_Store')
                        return; // skip ds store...
                    if (!_recognizedExtensions.includes(path.extname(file)))
                        return; // skip
                    return [
                        {
                            uid: tob64(filePath),
                            createdAt: st.birthtime,
                            modifiedAt: st.mtime,
                        },
                    ];
                }
            });
            const arrs = yield Promise.all(files.map((file) => getStats(file, recursiveDir)));
            const strArr = [];
            const index = strArr.concat.apply([], arrs); // ghetto flatten
            return index
                .filter(Boolean)
                .map((file) => {
                const temp = fs.readFileSync(fromb64(file.uid), 'utf-8');
                const { attributes: metadata } = frontMatter(temp);
                if (!metadata)
                    return; // require metadata
                if (!metadata.title)
                    return; // require title
                if (metadata.published === false)
                    return; // if published is false
                let pubdate = metadata.date || new Date().toString().slice(4, 15);
                const date = new Date(`${pubdate} EDT`); // cheeky hack
                metadata.pubdate = pubdate;
                metadata.date = new Date(pubdate);
                metadata.dateString = date.toDateString();
                file.metadata = metadata;
                return file;
            })
                .filter(Boolean)
                .sort((a, b) => {
                return a.metadata.pubdate < b.metadata.pubdate ? 1 : -1;
            });
        });
    }
    function getDataSlice(uid) {
        return __awaiter(this, void 0, void 0, function* () {
            const filepath = fromb64(uid);
            const md = vfile.readSync(filepath);
            const file = yield unified()
                .use(_preset)
                .process(md)
                .catch((err) => {
                console.error(report(md));
                throw err;
            });
            file.extname = '.html';
            return file.toString();
        });
    }
    return {
        createIndex,
        getDataSlice,
    };
};
