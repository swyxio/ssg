# Sapper Site Generator

a very experimental static site generator overlay on top of Sapper.

- 6 min Demo: https://www.youtube.com/watch?v=JpsxYhkVC7M

Because Sapper needs fixes to support static export at scale, and moves too slowly for the development of this project, we use a light fork of Sapper (https://github.com/sw-yx/sapper) instead of sapper itself. Hopefully this fork will not be necessary in future, but for now we need these fixes for ssg to work. We aim to keep this fork a superset of sapper as much as possible.

## ssg's Data Fetching Philosophy

SSG uses a new data fetching paradigm, so understanding this is critical to understanding how to write plugins and how SSG can be parallelizable as well as supports incremental builds. (long term, not exactly currently implemented)

Most static site generators have a very naive approach to data - pull everything upfront, then use all that upfront data to generate every single page. This makes page generation blocked by the data fetching phase, hence it cannot be parallelized. It also means total agnosticism to data model and every page has to be regenerated every time, hence incremental builds are hard.

SSG takes the insight that data indexes are cheap, and data slices are expensive. For example, it is cheap to get the filename and date modified info of every file in a directory, or an index of all entries in a CMS. It is more expensive to actually open up, read, and process each file/entry in the CMS. So we split up the data fetch process into a cheap `createIndex`, and an expensive, but parallelizable, `getDataSlice`. 

Lastly, the cheap indexes can also serve as a data manifest, which, if saved, can be diffed against prior manifests, so only new/modified data slices need be generated. This gets us incremental builds.

(again, not currently implemented, but this is the plan)

## How It Works

the sequence is:

- start (`ssg build` or `ssg dev`)
- look around the project filesystem for markdown files. this gets put into `mainIndex.ssgCoreData`. this is meant to help `ssg` be zero config
- if `ssg.config.js` exists, run `createIndex` and add whatever else you like to `mainIndex` under whatever keys you want.
- ssg/Sapper tries to generate a main/index page (eg list of posts)
- inside any svelte file in `src/routes`, [the Sapper preload function](https://sapper.svelte.dev/docs#Preloading) has been modified to have a special `this.ssgData` function which is a simple helper for pinging [a centralized data API route](https://github.com/sw-yx/swyxdotio/blob/master/src/routes/data/%5BssgData%5D.json.js) (required if you want to fetch data from ssg.. required for Sapper but eventually we want to get rid of this too)
- the data route returns the index data, from `createIndex`. you may specify a key - either `ssgCoreData` (what `this.ssgData` assumes by default) or whatever other custom key you want
- in `ssg build`, Sapper crawls the index page for links to detail pages (eg individual post) and starts to generate them, in parallel. for `ssg dev`, only the currently viewed page is generated.
- each page calls the data route again for data slices
- the data route calls `getDataSlice` with an optional key and an optional `uid`. A `uid` uniquely identifies the data slice.
- then the page is generated

in future we will persist the indexes as manifests, and then diff them between builds so we only run `getDataSlice` for slices that have changed. for incremental builds.

## Example code

1. fetching data - you can fetch inside `createIndex` and `getDataSlice`.

```js
// ssg.config.js
exports.createIndex = async (mainIndex = {}) => {
  console.log('getting intial data')
  mainIndex.MyKey1 = await fetch('whatever/1')
  mainIndex.MyKey2 = await fetch('whatever/2')
  return mainIndex
}
```

this is meant for grabbing indexes cheaply. `mainIndex` is a POJO that will be use and persisted through the ssg build session, add whatever index you want with a unique key. try not to outright replace `mainIndex` itself

2. getDataSlice

```js
// ssg.config.js
exports.getDataSlice = async (key, uid) => {
	if (key == 'MyKey1') {
		return fetch(`whatever/1/${uid}`)
	}
	if (key == 'MyKey2') {
		return fetch(`whatever/2/${uid}`)
	}
}
```

as you can see, we are grouping by lifecycle method, and the indexes don't really interact with each other. so we also have a way to group them by key:

```js
// ssg.config.js
exports.plugins = {
  MyKey1: {
    createIndex(mainIndex) {
      return fetch(`whatever/1/`)
    },
    getDataSlice(uid) {
      return fetch(`whatever/2/${uid}`)
    }
  },
  MyKey2: {
    createIndex(mainIndex) {
      return fetch(`whatever/2`)
    },
    getDataSlice(uid) {
      return fetch(`whatever/2/${uid}`)
    }
  }
}
```

which also opens up the way for [reusable data plugins](https://github.com/sw-yx/swyxdotio/blob/master/ssg.config.js#L22-L43):


```js
// could be an npm package
function myDataPlugin(identifier) {
  return {
    createIndex() {
      return fetch(identifier)
    },
    getDataSlice(uid) {
      return fetch(`${identifier}/${uid}`)
    }
  }
}

// ssg.config.js
exports.plugins = {
  MyKey1: myDataPlugin('whatever/1'),
  MyKey2: myDataPlugin('whatever/2')
}
```


3. adding the ssg data route

[you can copy and paste this exactly](https://github.com/sw-yx/swyxdotio/blob/master/src/routes/data/%5BssgData%5D.json.js) or you can run `ssg eject` and pick the inbuilt scaffold for data route

4. example index post `src/routes/index.svelte`

```html
<script context="module">
  export function preload({ params, query }) {
    return this.ssgData({ key: 'MyKey1' })
      .then(posts => ({ posts }))
      .catch(err => {
        this.error(500, err.message)
      })
  }
</script>

<script>
  export let posts
</script>

  <header>
    <h1>Writing</h1>
  </header>
  <ul>
    {#each posts as post}
      <li>
        <a rel="prefetch" href="/{post.slug}">
          <h2>{post.title}</h2>
        </a>
      </li>
    {/each}
  </ul>
```

5. example detail post `src/routes/[slug].svelte`

```html
<script context="module">
  export async function preload({ params, query }) {
    const post = await this.ssgData({ key: 'MyKey1', id: params.slug })
    return { post }
  }
</script>

<script>
  export let post
</script>

<SlugTemplate>
  <h1 id="postTitle">{post.title}</h1>
  {@html post.html}
</SlugTemplate>
```

as you can see, you are expected to know and use Sapper and Svelte conventions.

You can experiment around with the [SSG Demo Repo](https://github.com/sw-yx/ssg-demo). You may run into small bugs, please file them. 
## Example usage

Active Codebases you can see this project in use:

- https://github.com/sw-yx/swyxdotio
- https://github.com/sveltejs/community

In v0.x we reserve the right to break APIs without warning. Get involved if you need advance warning.

## Installation

```bash
yarn add ssg
```

Svelte and @ssgjs/sapper are included as direct dependencies, however feel free to also install them if you need to.

To get going, you will then need something in `src/routes`, usually an `index.svelte` file to get started. You can scaffold one by running `yarn ssg eject` and picking `sampleIndex.svelte` to see an example. [This demo repo will also help show how `ssg` is meant to be used](https://github.com/sw-yx/ssg-demo).

## Contributing

This project needs feedback and maintainers. In fact if you'd like to take it over please be my guest. I don't have time for this. I'm only doing it cause no one else has.

This is a very nascent project, you'll run into bugs. report them please and also help add tests. If you have feature suggestions please open an issue first to see if it is something we want, before wasting time on a PR.

## Usage and CLI API

- `ssg eject` - scaffold out fallback files used by `ssg`
- `ssg dev` - same as `sapper dev`, runs data pipeline specified in `ssg.config.js` and watches those files
- `ssg export` - same as `sapper export`, runs data pipeline specified in `ssg.config.js` and exports the sapper app as a static site.

## Zero Config

By default, `ssg` works as a simple zero config layer over `sapper`. In fact, for the time being, `ssg` will endeavor to be a `sapper` superset as far as possible. It uses the programmatic api behind the cli commands, adding some functionality in [the `@ssgjs/sapper` fork](https://www.npmjs.com/package/@ssgjs/sapper) of sapper.

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
✔ A file exists at src/template.html. Are you sure you want to overwrite? (y/N) · false
✔ A file exists at src/client.js. Are you sure you want to overwrite? (y/N) · true
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
```


> ⚠️ STOP! the filename is extremely important! doublecheck it is `src/routes/data/[ssgData].json.js` or expect the above code to break

You can scaffold this file with `ssg eject`.

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
    const res = await this.ssgData({ key, id: params.slug }) // defaults to key: 'ssgCoreData' and id: 'index'
    if (res.status === 200) {
      return data
    } else {
      this.error(res.status, data.message)
    }
  }
</script>
<script>
  export let data
</script>
```

When we drop Sapper we'll likely have a more ergonomic api for this.

## Core Data

As of v0.45 `ssg` now also reads all markdown files in the root directory by default. This is inline with 11ty's practice and is configurable by setting a `coreDataDirPath` string in `ssg.config.js`:

```js
// example ssg.config.js
exports.coreDataOpts = {
  coreDataDirPath: 'content/blog' // defaults to '.'
}
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

You can run `ssg export` to export just like `sapper export` does. for convenience, I've included a `netlify.toml` config so you dont have to look it up. Just `ssg eject`.


## Debugging

ssg uses [`debug`](https://www.npmjs.com/package/debug) to log diagnostic messages. Set a Node env variable to enable this logging:

```bash
DEBUG=ssg ssg dev
# or DEBUG=* ssg export
```

You have a few more degrees of control available incl filtering out messages, look at the `debug` docs for more ideas.
