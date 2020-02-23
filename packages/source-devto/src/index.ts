const unified = require('unified')
const vfile = require('vfile')
const report = require('vfile-reporter')
const { produce } = require('immer')
const fetch = require('node-fetch')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')
const readdir = promisify(fs.readdir)
const stat = promisify(fs.stat)
const lstat = promisify(fs.lstat)
const frontMatter = require('front-matter')

const tob64 = (str: string) => Buffer.from(str).toString('base64')
const fromb64 = (str: string) => Buffer.from(str, 'base64').toString()

/**
 *
 * globals, we may have to make per-invocation in future
 *
 */
let _preset = {
  settings: {},
  plugins: [
    require('remark-parse'),
    require('remark-slug'),
    [
      require('remark-autolink-headings'),
      {
        behavior: 'append',
        content: {
          type: 'element',
          tagName: 'span',
          properties: { className: ['icon', 'icon-link'] },
          children: [{ type: 'text', value: ' 🔗' }],
        },
      },
    ],
    require('remark-toc'),
    require('remark-sectionize'),
    require('remark-rehype'),
    require('rehype-format'),
    [require('remark-frontmatter'), ['yaml']],
    [require('rehype-shiki'), { theme: 'Material-Theme-Palenight' }],
    require('rehype-stringify'),
  ],
}

type PluginOpts = {
  apiKey: string,
  filterType: 'all' | 'current' | undefined
  modifyRemarkConfig?: string
  // onCreateIndex?: (index: {
  //     [slug: string]: SSGDevToPluginPost;
  // }) => Promise<void>
}
type SSGDevToPluginPost = { uid: string; createdAt: Date; modifiedAt: Date; metadata: any }
type DevToPostType = {
  type_of: string, //'article',
  id: Number, // 55238,
  title: string, // '3 Tips from Kent C Dodds for People Just Getting Started',
  description: string, // 'advice for beginners from a podcast',
  cover_image: string | null, // null,
  published: Boolean, // true,
  published_at: string, // '2018-10-15T23:54:50.629Z',
  tag_list: string[], // ['advice'],
  slug: string, // '3-tips-from-kent-c-dodds-for-people-just-getting-started-ik8',
  path: string, // '/swyx/3-tips-from-kent-c-dodds-for-people-just-getting-started-ik8',
  url: string, // 'https://dev.to/swyx/3-tips-from-kent-c-dodds-for-people-just-getting-started-ik8',
  canonical_url: string, // 'https://dev.to/swyx/3-tips-from-kent-c-dodds-for-people-just-getting-started-ik8',
  comments_count: Number, // 5,
  positive_reactions_count: Number, // 39,
  page_views_count: Number, // 279,
  published_timestamp: string, // '2018-10-15T23:54:50Z',
  body_markdown: string, // note that it will include user written frontmatter
  user:
  {
    name: string, // 'shawn swyx wang 🇸🇬',
    username: string, // 'swyx',
    twitter_username: string, // 'swyx',
    github_username: string | null, // null,
    website_url: string, // 'http://swyx.io',
    profile_image: string, // 'https://res.cloudinary.com/practicaldev/image/fetch/s--OOhJF6mC--/c_fill,f_auto,fl_progressive,h_640,q_auto,w_640/https://dev-to-uploads.s3.amazonaws.com/uploads/user/profile_image/47766/26fbd2bf-c352-447c-9b4f-f66652dc4899.jpg',
    profile_image_90: string, // 'https://res.cloudinary.com/practicaldev/image/fetch/s--zGW7kqpH--/c_fill,f_auto,fl_progressive,h_90,q_auto,w_90/https://dev-to-uploads.s3.amazonaws.com/uploads/user/profile_image/47766/26fbd2bf-c352-447c-9b4f-f66652dc4899.jpg'
  }
}
type DevToPostProcessedType = DevToPostType & {
  html?: string,
  userFrontMatter?: Object,
  metadata?: {
    title: string,
    date: Date,
    categories?: string[],
    description?: string,
    subtitle?: string
  }
}
type DevToPluginSlugMap = {
  [slug: string]: DevToPostProcessedType
}


module.exports = function(opts: PluginOpts) {
  if (!opts.apiKey) throw new Error('must supply dev.to API key to options.apiKey')
  if (opts.modifyRemarkConfig) {
    _preset = produce(_preset, opts.modifyRemarkConfig)
  }

  const headers = {'api-key': opts.apiKey}
  let allArticles: DevToPluginSlugMap = {}

  // flattens all directories below the dirPath
  // is recursive!
  async function createIndex() {
    let page = 0
    let per_page = 30 // can go up to 1000
    let latestResult: DevToPostType[] = []
    do {
      page += 1 // bump page up by 1 every loop
      latestResult = await fetch(
        `https://dev.to/api/articles/me/published?page=${page}&per_page=${per_page}`,
        { headers }
      )
        .then((res: any) => res.json())
        .catch((err: Error) => {
          console.error(err) // very basic error handling, customize as needed
          throw new Error(`error fetching page ${page}, {err}`)
        })
      await Promise.all(latestResult.map(async post => {
        const { attributes: userFrontMatter } = frontMatter(post.body_markdown)
        if (!userFrontMatter.slug) {
          // console.warn(`Warning: no slug in frontmatter for ${processedPost.slug}, adopting dev.to's slug`)
          userFrontMatter.slug = post.slug
        }
        let processedPost: DevToPostProcessedType = post
        processedPost.metadata = {
          title: post.title,
          date: new Date(post.published_at), // may want to have userMetadata control this
          categories: post.tag_list,
          description: post.description,
          subtitle: userFrontMatter.subtitle
        }
        allArticles[userFrontMatter.slug] = processedPost
      }))
    } while (latestResult.length === per_page)
    return allArticles
  }

  async function getDataSlice(uid: string) {
    const post = allArticles[uid];
    var post_vfile = vfile({ path: post.slug, contents: post.body_markdown });
    const file = await unified()
      .use(_preset)
      .process(post_vfile)
      .catch((err: Error) => {
        console.error(report(post_vfile));
        throw err;
      });
    file.extname = '.html';
    let processedPost: DevToPostProcessedType = post;
    processedPost.html = file.toString();
    return processedPost;
  }

  return {
    createIndex,
    getDataSlice,
  }
}
