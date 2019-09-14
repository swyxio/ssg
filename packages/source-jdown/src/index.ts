const jdown = require('jdown')
// const fs = require('fs')
// const path = require('path')
// const slugify = require('slugify')

const defaultOpts = {
  output: './static/jdown-assets',
  path: '/jdown-assets',
}
export async function loadJdown(jdownDir: string, opts: typeof defaultOpts = defaultOpts) {
  const data = await jdown(jdownDir, opts)
  return data
}

// const jdown = require('jdown') // parses a folder of markdown files into objects. very handy!
// const content = await jdown('content', {
//   // so that markdown images show nicely
//   assets: {
//     output: './static/jdown-assets',
//     path: '/jdown-assets',
//   },
// })
// const color = content.color
// const index = [] // build up array of objects for the top level list
// Object.entries(color).forEach(([k, v]) => {
//   v.slug = k
//   index.push({
//     title: v.title,
//     slug: k,
//   })
// })
