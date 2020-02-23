declare const unified: any;
declare const vfile: any;
declare const report: any;
declare const produce: any;
declare const fetch: any;
declare const promisify: any;
declare const fs: any;
declare const path: any;
declare const readdir: any;
declare const stat: any;
declare const lstat: any;
declare const frontMatter: any;
declare const tob64: (str: string) => string;
declare const fromb64: (str: string) => string;
/**
 *
 * globals, we may have to make per-invocation in future
 *
 */
declare let _preset: {
    settings: {};
    plugins: any[];
};
declare type PluginOpts = {
    apiKey: string;
    filterType: 'all' | 'current' | undefined;
    modifyRemarkConfig?: string;
};
declare type SSGDevToPluginPost = {
    uid: string;
    createdAt: Date;
    modifiedAt: Date;
    metadata: any;
};
declare type DevToPostType = {
    type_of: String;
    id: Number;
    title: String;
    description: String;
    cover_image: String | null;
    published: Boolean;
    published_at: String;
    tag_list: String[];
    slug: String;
    path: String;
    url: String;
    canonical_url: String;
    comments_count: Number;
    positive_reactions_count: Number;
    page_views_count: Number;
    published_timestamp: String;
    body_markdown: String;
    user: {
        name: String;
        username: String;
        twitter_username: String;
        github_username: String | null;
        website_url: String;
        profile_image: String;
        profile_image_90: String;
    };
};
declare type DevToPostProcessedType = DevToPostType & {
    html?: String;
    userFrontMatter?: Object;
};
declare type DevToPluginSlugMap = {
    [slug: string]: DevToPostProcessedType;
};
