# @ssgjs/source-yaml

example usage

```js
// ssg.config.js
const yaml = require('@ssgjs/source-yaml')
const events = yaml({ dirPath: 'content/events' })

exports.plugins = {
  events,
}

// not needed
exports.getDataSlice = async (key, uid) => {
  console.log('optional getDataSlice action')
  // etc
}

// mandatory. called once, should be cheap
exports.createIndex = async (mainIndex = {}) => {
  console.log('getting intial data')
  // can add more data to index here
  console.log('Number of Events:', Object.keys(mainIndex.events).length)
  return mainIndex
}
```
