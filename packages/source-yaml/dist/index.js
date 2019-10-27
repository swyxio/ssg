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
Object.defineProperty(exports, "__esModule", { value: true });
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const slugify = require('@sindresorhus/slugify');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const tob64 = (str) => Buffer.from(str).toString('base64');
const fromb64 = (str) => Buffer.from(str, 'base64').toString();
/**
 *
 * globals, we may have to make per-invocation in future
 *
 */
exports.defaultRecognizedExtensions = ['.yml', '.yaml'];
function SSGYamlPlugin(opts) {
    if (typeof opts.dirPath === 'undefined')
        throw new Error('dirPath not supplied to remark plugin');
    let recognizedExtensions = opts.recognizedExtensions || exports.defaultRecognizedExtensions;
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
                            file,
                            filePath,
                            uid: tob64(filePath),
                            createdAt: st.birthtime,
                            modifiedAt: st.mtime,
                        },
                    ];
                }
            });
            const arrs = yield Promise.all(files.map((file) => getStats(file, recursiveDir)));
            const strArr = [];
            let fileArr = strArr.concat
                .apply([], arrs) // ghetto flatten
                .filter(Boolean);
            let index = {};
            fileArr.forEach((obj) => {
                const { filePath } = obj;
                const baseName = slugify(filePath);
                obj.data = yaml.safeLoad(fs.readFileSync(filePath, 'utf-8'));
                index[baseName] = obj;
            });
            return index;
        });
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
}
exports.default = SSGYamlPlugin;
