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
    type_of: string;
    id: Number;
    title: string;
    description: string;
    cover_image: string | null;
    published: Boolean;
    published_at: string;
    tag_list: string[];
    slug: string;
    path: string;
    url: string;
    canonical_url: string;
    comments_count: Number;
    positive_reactions_count: Number;
    page_views_count: Number;
    published_timestamp: string;
    body_markdown: string;
    user: {
        name: string;
        username: string;
        twitter_username: string;
        github_username: string | null;
        website_url: string;
        profile_image: string;
        profile_image_90: string;
    };
};
declare type DevToPostProcessedType = DevToPostType & {
    html?: string;
    userFrontMatter?: Object;
    metadata?: {
        title: string;
        date: Date;
        categories?: string[];
        description?: string;
        subtitle?: string;
    };
};
declare type DevToPluginSlugMap = {
    [slug: string]: DevToPostProcessedType;
};
