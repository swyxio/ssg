# @ssgjs/source-remark

generate indexes via filesystem, and then use the remark ecosystem to generate data slices


```js
// ssg.config.js
const remark = require('@ssgjs/source-remark')
const writing = remark({ dirPath: 'content/writing' })
const speaking = remark({ dirPath: 'content/talks' })

exports.plugins = {
  writing,
  speaking
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
  console.log('Number of talks:', Object.keys(mainIndex.speaking).length)
  console.log('Number of articles:', Object.keys(mainIndex.writing).length)
  return mainIndex
}
```