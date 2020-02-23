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
const unified = require('unified');
const vfile = require('vfile');
const report = require('vfile-reporter');
const { produce } = require('immer');
const fetch = require('node-fetch');
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
                    children: [{ type: 'text', value: ' 🔗' }],
                },
            },
        ],
        require('remark-toc'),
        require('remark-sectionize'),
        require('remark-rehype'),
        require('rehype-format'),
        [require('remark-frontmatter'), ['yaml']],
        [require('rehype-shiki'), { theme: 'Material-Theme-Palenight' }],
        require('rehype-stringify'),
    ],
};
module.exports = function (opts) {
    if (!opts.apiKey)
        throw new Error('must supply dev.to API key to options.apiKey');
    if (opts.modifyRemarkConfig) {
        _preset = produce(_preset, opts.modifyRemarkConfig);
    }
    const headers = { 'api-key': opts.apiKey };
    let allArticles = [];
    // flattens all directories below the dirPath
    // is recursive!
    function createIndex() {
        return __awaiter(this, void 0, void 0, function* () {
            let page = 0;
            let per_page = 30; // can go up to 1000
            let latestResult = [];
            do {
                page += 1; // bump page up by 1 every loop
                latestResult = yield fetch(`https://dev.to/api/articles/me/published?page=${page}&per_page=${per_page}`, { headers })
                    .then((res) => res.json())
                    .catch((err) => {
                    console.error(err); // very basic error handling, customize as needed
                    throw new Error(`error fetching page ${page}, {err}`);
                });
                yield Promise.all(latestResult.map((post) => __awaiter(this, void 0, void 0, function* () {
                    const { attributes: userFrontMatter } = frontMatter(post.body_markdown);
                    if (!userFrontMatter.slug) {
                        // console.warn(`Warning: no slug in frontmatter for ${processedPost.slug}, adopting dev.to's slug`)
                        userFrontMatter.slug = post.slug;
                    }
                    let processedPost = post;
                    processedPost.metadata = {
                        title: post.title,
                        slug: userFrontMatter.slug,
                        date: new Date(post.published_at),
                        categories: post.tag_list,
                        description: post.description,
                        subtitle: userFrontMatter.subtitle
                    };
                    allArticles.push(processedPost);
                })));
            } while (latestResult.length === per_page);
            return allArticles;
        });
    }
    function getDataSlice(uid) {
        return __awaiter(this, void 0, void 0, function* () {
            const post = allArticles.find(post => post.slug === uid);
            if (!post)
                throw new Error(`post ${uid} not found`);
            var post_vfile = vfile({ path: post.slug, contents: post.body_markdown });
            const file = yield unified()
                .use(_preset)
                .process(post_vfile)
                .catch((err) => {
                console.error(report(post_vfile));
                throw err;
            });
            file.extname = '.html';
            let processedPost = post;
            processedPost.html = file.toString();
            return processedPost;
        });
    }
    return {
        createIndex,
        getDataSlice,
    };
};
