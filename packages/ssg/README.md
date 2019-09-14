# Sapper Site Generator

a very experimental static site generator overlay on top of Sapper. For a simple demo see this:

https://www.youtube.com/watch?v=o_o0PAts9Gg&feature=youtu.be

## Installation

```bash
yarn add sapper svelte ssg
```

## What it expects

1. you will have a `src/routes/data/[slug].json.js` file in your main Sapper project, that looks like this:

```js
const { getData } = require('../../../ssg.config')

export async function get(req, res) {
  const { slug } = req.params
  const splitSlug = slug.split('___ssg___')
  const category = splitSlug[0]
  const realSlug = splitSlug[1]
  const data = await getData(category, realSlug)
  if (data) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: `Not found` }))
  }
}
```

2. You should have a `ssg.config.js` that exports a `getInitialData` (run once) and `getData` (run each time) function that provides this data:

```js
exports.getData = async (category, slug) => {
  // read cache and 
  // do less expensive subsequent fetches
  const data = require(path.resolve('.ssg/data.json'))
  const result = data[category][slug]
  if (typeof result === 'undefined') throw new Error('no data found for ' + slug)
  return result
}

exports.getInitialData = async () => {
  // do expensive initial fetches and cache them in .ssg/data.json
  return {
    index: [{ title: 'foo', slug: 'foo' }, { title: 'bar', slug: 'bar' }],
    foo: { title: 'foo', html: '<div> the foo post </div>' },
    bar: { title: 'bar', html: '<div> the bar post </div>' },
  }
}
```

## What it does

Under the hood, `ssg` runs `sapper dev` for you, and watches and reloads it whenever you change your config or contents folder.
