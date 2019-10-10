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
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
// const slugify = require('@sindresorhus/slugify')
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
// const lstat = promisify(fs.lstat)
const tob64 = (str) => Buffer.from(str).toString('base64');
const fromb64 = (str) => Buffer.from(str, 'base64').toString();
// export function extractSlugObjectFromArray(arr: { slug: string }[]) {
//   let obj = {}
//   arr.forEach((item) => (obj[item.slug] = item))
//   return obj
// }
/**
 *
 * globals, we may have to make per-invocation in future
 *
 */
let defaultRecognizedExtensions = ['.yml', '.yaml'];
module.exports = function (opts) {
    if (typeof opts.dirPath === 'undefined')
        throw new Error('dirPath not supplied to remark plugin');
    if (!Array.isArray(opts.recognizedExtensions))
        throw new Error('opts.recognizedExtensions must be an array of strings');
    let recognizedExtensions = opts.recognizedExtensions || defaultRecognizedExtensions;
    // flattens all directories below the dirPath
    // is recursive!
    function createIndex(recursiveDir = opts.dirPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield readdir(recursiveDir);
            const getStats = (file, _dirPath) => __awaiter(this, void 0, void 0, function* () {
                const filePath = path.join(_dirPath, file);
                const st = yield stat(filePath);
                if (st.isDirectory()) {
                    const temp = yield createIndex(filePath); // recursion
                    return Object.values(temp); // take it back out of an object into an array
                }
                else {
                    if (file === '.DS_Store')
                        return; // skip ds store...
                    if (!recognizedExtensions.includes(path.extname(file)))
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
            let index = strArr.concat.apply([], arrs); // ghetto flatten
            index = index
                .filter(Boolean)
                .map((file) => {
                // const temp = 
                // const { attributes: metadata } = frontMatter(temp)
                // if (!metadata) return // require metadata
                // if (!metadata.title) return // require title
                // if (metadata.published === false) return // if published is false
                // let pubdate = metadata.date || new Date().toString().slice(4, 15)
                // const date = new Date(`${pubdate} EDT`) // cheeky hack
                // metadata.pubdate = pubdate
                // metadata.date = new Date(pubdate)
                // metadata.dateString = date.toDateString()
                // file.metadata = metadata
                return yaml.safeLoad(fs.readFileSync(fromb64(file.uid), 'utf-8'));
            })
                .filter(notEmpty);
            // // i dont really use this yet
            // if (opts.onCreateIndex) {
            //   await opts.onCreateIndex(index) // optional logging
            // }
            return index;
        });
    }
    // https://stackoverflow.com/questions/43118692/typescript-filter-out-nulls-from-an-array
    function notEmpty(value) {
        return value !== null && value !== undefined;
    }
    function getDataSlice(uid) {
        return __awaiter(this, void 0, void 0, function* () {
            const filepath = fromb64(uid);
            const data = yaml.safeLoad(fs.readFileSync(filepath), 'utf-8');
            return data;
        });
    }
    return {
        createIndex,
        getDataSlice,
    };
};
