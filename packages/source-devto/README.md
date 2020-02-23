# @ssgjs/source-devto

pull from dev.to given an api key


```js
// ssg.config.js
require('dotenv-safe').config()
const devToPlugin = require('@ssgjs/source-devto')({ 
  apiKey: process.env.DEV_TO_API_KEY
})

exports.plugins = {
  devToPlugin,
}

// mandatory. called once, should be cheap
exports.createIndex = async (mainIndex = {}) => {
  console.log('getting intial data')
  // can add more data to index here
  console.log('Number of articles:', Object.keys(mainIndex.devToPlugin).length)
  return mainIndex
}
```