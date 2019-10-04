# Sapper Site Generator

a very experimental static site generator overlay on top of Sapper. For a simple demo see this:

https://www.youtube.com/watch?v=o_o0PAts9Gg&feature=youtu.be

Because Sapper needs fixes to support static export at scale, we use a light fork of Sapper (https://github.com/sw-yx/sapper) instead of sapper itself. Hopefully this fork will not be necessary in future, but for now we need these fixes for ssg to work.

## Installation

```bash
yarn add @ssgjs/sapper svelte ssg
```

## What it expects

1. you will have a `src/routes/data/[ssgData].json.js` file in your main Sapper project, that looks like this:

```js
// src/routes/data/[ssgData].json.js`
const { getDataSlice, getIndex } = require('ssg/readConfig')

export async function get(req, res) {
  const { ssgData } = req.params
  const splitSlug = ssgData.split('___ssg___')
  const key = splitSlug[0]
  const uid = splitSlug[1]
  const mainIndex = getIndex()
  let data
  // console.log('getting', key, uid)
  if (uid === 'index') {
    data = mainIndex[key]
  } else {
    data = await getDataSlice(key, uid)
  }
  if (typeof data !== 'undefined') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: `Not found` }))
  }
}

> ⚠️ STOP! the filename is extremely important! doublecheck it is `src/routes/data/[ssgData].json.js``

```

2. You should have a `ssg.config.js` that exports a `createIndex` (run once) and `getDataSlice` (run each time) function that provides this data:

```js
// optional. called repeatedly, can be expensive
exports.getDataSlice = async (key, uid) => {
  console.log('optional getDataSlice action')
  // we dont really use the key here
  if (key === 'posts') {
    if (uid === 'foo') {
      return { title: 'foo', html: '<div> the foo post </div>' }
    } else {
      return { title: 'bar', html: '<div> the bar post </div>' }
    }
  } else {
    throw new Error('invalid key ' + key )
  }
}

exports.createIndex = async (mainIndex = {}) => {
  // do expensive initial fetches and cache them in .ssg/data.json
  mainIndex.index = [{ title: 'foo', slug: 'foo' }, { title: 'bar', slug: 'bar' }]
  return mainIndex
}

// optional lifecycle hook
exports.postExport = async mainIndex => {
  // eg for RSS
  console.log('postExport', mainIndex)
}
```


In your templates, you may now query this data at any time:

```html
<!-- src/routes/talks/[slug].svelte -->
<script context="module">
  export async function preload({ params, query }) {
    cosnt key = 'posts'
    const res = await this.fetch(`data/${key}___ssg___${params.slug}.json`)
    const data = await res.json()
    if (res.status === 200) {
      return { post: data }
    } else {
      this.error(res.status, data.message)
    }
  }
</script>
```


## What it does

Under the hood, `ssg` runs `sapper dev` for you, and watches and reloads it whenever you change your config or contents folder.

It runs `createIndex` once and saves that result to a cache, and then you can run `getDataSlice` anytime you want to query that cache.

## Plugins

You can also use plugins that have prewritten `createIndex` and `getDataSlice` for you:

```js
// ssg.config.js
const remark = require('@ssgjs/source-remark')
const writing = remark({ dirPath: 'content/writing' })
const speaking = remark({ dirPath: 'content/talks' })

// optional data plugins. must be object, so we can namespace
exports.plugins = {
  writing,
  speaking
}
```