"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');
const slugify = require('slugify');
function extractSlugObjectFromArray(arr) {
    let obj = {};
    arr.forEach((item) => (obj[item.slug] = item));
    return obj;
}
exports.extractSlugObjectFromArray = extractSlugObjectFromArray;
function loadYaml(ymlpath) {
    const fullData = yaml.safeLoad(fs.readFileSync(path.resolve(ymlpath), 'utf8'));
    if (Array.isArray(fullData) && fullData.length && fullData[0].title) {
        // enrich with slug
        fullData.forEach((col, i) => {
            col.slug = col.title ? slugify(col.title) : slugify(ymlpath) + i;
        });
    }
    return fullData;
}
exports.loadYaml = loadYaml;
function filterDataArray(fullData, opts) {
    let filteredData = fullData;
    if (opts.filterForFields && Array.isArray(opts.filterForFields)) {
        filteredData = [];
        fullData.forEach((item, i) => {
            const newItem = {};
            opts.filterForFields &&
                opts.filterForFields.forEach((field) => {
                    newItem[field] = item[field];
                });
            filteredData.push(newItem);
        });
    }
    return filteredData;
}
exports.filterDataArray = filterDataArray;
