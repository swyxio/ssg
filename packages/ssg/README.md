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
  const data = await getData()
  if (data[slug]) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(data[slug]))
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: `Not found` }))
  }
}
```

2. You should have a `ssg.config.js` that exports a `getData` function that provides this data:

```js
exports.getData = async () => {
  // do whatever you want
  return {
    index: [{ title: 'foo', slug: 'foo' }, { title: 'bar', slug: 'bar' }],
    foo: { title: 'foo', html: '<div> the foo post </div>' },
    bar: { title: 'bar', html: '<div> the bar post </div>' },
  }
}
```

## What it does

Under the hood, `ssg` runs `sapper dev` for you, and watches and reloads it whenever you change your config or contents folder.
