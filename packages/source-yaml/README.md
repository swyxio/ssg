# @ssgjs/source-yaml

example usage

```js
// ssg.config.js
const { loadYaml, filterDataArray, extractSlugObjectFromArray } = require('@ssgjs/source-yaml')
exports.getData = async () => {
  const index = {}
  const color = loadYaml('content/color.yml')
  index.color = filterDataArray(color, { filterForFields: 'title,slug,image'.split(',') })
  const data = { index, ...extractSlugObjectFromArray(color) }
  return data
}
```
