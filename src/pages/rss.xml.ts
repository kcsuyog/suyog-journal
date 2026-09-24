import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { publishedPosts } from '../lib/posts';
export async function GET(context: APIContext) {
  return rss({ title: 'Suyog’s journal', description: 'Books, life, and the things in between.', site: context.site!,
    items: (await publishedPosts()).map(post => ({ title: post.data.title, description: post.data.description, pubDate: post.data.date, link: `/${post.id}/` })),
  });
}
