# Sapper Site Generator

a very experimental static site generator overlay on top of Sapper.

- 6 min Demo: https://www.youtube.com/watch?v=JpsxYhkVC7M

Because Sapper needs fixes to support static export at scale, and moves too slowly for the development of this project, we use a light fork of Sapper (https://github.com/sw-yx/sapper) instead of sapper itself. Hopefully this fork will not be necessary in future, but for now we need these fixes for ssg to work. We aim to keep this fork a superset of sapper as much as possible.

## Example usage

Active Codebases you can see this project in use:

- https://github.com/sw-yx/swyxdotio
- https://github.com/sveltejs/community

## Installation

```bash
yarn add ssg
```

Svelte and @ssgjs/sapper are included as direct dependencies, however feel free to also install them if you need to.

## Usage and CLI API

- `ssg eject` - scaffold out fallback files used by `ssg`
- `ssg dev` - same as sapper dev, runs data pipeline specified in `ssg.config.js` and watches those files
- `ssg export` - same as sapper export, runs data pipeline specified in `ssg.config.js`

## Zero Config

By default, `ssg` works as a simple zero config layer over `sapper`. In fact, for the time being, `ssg` will endeavor to be a `sapper` superset as far as possible. It uses the programmatic api behind the cli commands, adding some functionatlity in [the `@ssgjs/sapper` fork](https://www.npmjs.com/package/@ssgjs/sapper) of sapper.

## Fallbacks and `ssg eject`

`ssg` makes these Sapper files optional:

- `src/client.js`
- `src/server.js`
- `src/service-workers.js`
- `src/template.html`
- `rollup.config.js`

They are located in the [ejectableFiles folder](./ejectableFiles).

However, you can scaffold out these files with the `ssg eject` command:

```bash
$ yarn ssg eject
✔ Pick files to copy out · template.html, client.js
✔ A file exists at src/template.html. Are you sure you want to overwrite? (y/N) (y/N) · true
✔ A file exists at src/client.js. Are you sure you want to overwrite? (y/N) (y/N) · false
copied /Users/swyx/Work/community/node_modules/ssg/ejectableFiles/client.js to src/client.js
```


## Generating pages from data

1. if you need to get data, you will have a `src/routes/data/[ssgData].json.js` file in your main Sapper project, that looks like this:

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

2. If you need to send data, you should have a `ssg.config.js` that exports a `createIndex` (run once) and `getDataSlice` (run each time) function that provides this data:

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

## `ssg dev`

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

## Deploying

You can run `ssg export` to export just like `sapper export` does. for convenience, I've included a `neltify.toml` config so you dont have to look it up. Just `ssg eject`.

