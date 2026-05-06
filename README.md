# @jsonic/feed

This plugin allows the [Jsonic](https://jsonic.senecajs.org) JSON parser
(via [`@jsonic/xml`](https://github.com/jsonicjs/xml)) to parse
syndication feeds — **RSS 0.90, 0.91, 0.92, 1.0, 2.0** and **Atom 0.3,
1.0** — into a typed structure. By default every dialect is normalised
to an Atom-shaped result; pass `format: 'native'` to keep the source
dialect's structure, or `format: 'raw'` to get back the underlying
`XmlElement` tree from `@jsonic/xml`.

[![npm version](https://img.shields.io/npm/v/@jsonic/feed.svg)](https://npmjs.com/package/@jsonic/feed)
[![build](https://github.com/jsonicjs/feed/actions/workflows/build.yml/badge.svg)](https://github.com/jsonicjs/feed/actions/workflows/build.yml)


| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |


The documentation below is organized along the
[Diátaxis](https://diataxis.fr) quadrants:

- [Quick start](#quick-start) — tutorial
- [How-to guides](#how-to-guides) — task recipes
- [Reference](#reference) — API surface
- [Format mapping](#format-mapping) — explanation


## Quick start

Install:

```bash
npm install @jsonic/feed jsonic @jsonic/xml
```

Register the plugin and call the Jsonic instance as usual — the result
is an Atom-shaped object regardless of the input dialect:

```typescript
import { Jsonic } from 'jsonic'
import { Feed } from '@jsonic/feed'

const j = Jsonic.make().use(Feed)

const atom = j(`
  <rss version="2.0">
    <channel>
      <title>My Blog</title>
      <link>https://example.com/</link>
      <description>Posts</description>
      <item>
        <title>Hello</title>
        <link>https://example.com/1</link>
        <guid>https://example.com/1</guid>
        <pubDate>Wed, 13 Dec 2003 18:30:02 GMT</pubDate>
      </item>
    </channel>
  </rss>
`)

// atom.format         === 'atom'
// atom.title.value    === 'My Blog'
// atom.entries[0].id  === 'https://example.com/1'
// atom.entries[0].links[0] === { href: 'https://example.com/1', rel: 'alternate' }
```


## How-to guides

### Keep the source dialect's structure (no Atom conversion)

```typescript
import { Jsonic } from 'jsonic'
import { Feed, type Rss2Feed } from '@jsonic/feed'

const j = Jsonic.make().use(Feed, { format: 'native' })

const native = j(rssSource) as Rss2Feed
// native.format  === 'rss'
// native.version === '2.0'
// native.items[0].guid?.value === 'item-1-guid'
```

The native return type is a discriminated union on `format`:

| Input dialect       | Native return type | `format`  | `version`         |
|---------------------|--------------------|-----------|-------------------|
| Atom 1.0 / Atom 0.3 | `AtomFeed`         | `'atom'`  | `'1.0'` / `'0.3'` |
| RSS 2.0 / 0.92 / 0.91 | `Rss2Feed`       | `'rss'`   | `'2.0'` / `'0.92'` / `'0.91'` |
| RSS 1.0 / 0.90      | `Rss1Feed`         | `'rdf'`   | `'1.0'` / `'0.90'` |

### Get the raw XML tree

```typescript
import { Jsonic } from 'jsonic'
import { Feed } from '@jsonic/feed'

const j = Jsonic.make().use(Feed, { format: 'raw' })

const tree = j(rssSource)
// tree.localName  === 'rss'
// tree.children   === [...]
```

This is the `XmlElement` produced by `@jsonic/xml` with no further
processing, useful when you want to handle non-standard extensions.

### Detect a dialect without converting

```typescript
import { Jsonic } from 'jsonic'
import { Feed, detect } from '@jsonic/feed'

const j = Jsonic.make().use(Feed, { format: 'raw' })
const root = j(rssSource)
const { dialect, version } = detect(root)
// e.g. { dialect: 'rss', version: 'rss20' }
```


## Reference

```typescript
const Feed: Plugin

function detect(root: XmlElement): { dialect: FeedDialect; version: FeedVersion }

type FeedOptions = {
  format?: 'atom' | 'native' | 'raw'  // default: 'atom'
}

type FeedResult = AtomFeed | Rss2Feed | Rss1Feed | XmlElement

type FeedDialect = 'atom' | 'rss' | 'rdf' | 'unknown'

type FeedVersion =
  | 'atom10' | 'atom03'
  | 'rss20' | 'rss092' | 'rss091u' | 'rss091n'
  | 'rss10' | 'rss090'
  | 'unknown'
```

Use the plugin via `Jsonic.make().use(Feed, options?)`. After
registration, invoke the jsonic instance as a function on a feed XML
source string; it returns the converted feed (or the raw `XmlElement`
tree, when `options.format === 'raw'`).

| Option   | Type                          | Default  | Effect                                                |
|----------|-------------------------------|----------|-------------------------------------------------------|
| `format` | `'atom' \| 'native' \| 'raw'` | `'atom'` | Output shape: normalised Atom, dialect-native, or raw XML tree |

Atom shape (the default output) follows RFC 4287 closely:

```typescript
type AtomFeed = {
  format: 'atom'
  version: '1.0' | '0.3' | string
  id?: string
  title?: AtomText
  updated?: string
  authors?: AtomPerson[]
  contributors?: AtomPerson[]
  categories?: AtomCategory[]
  generator?: AtomGenerator
  icon?: string
  logo?: string
  rights?: AtomText
  subtitle?: AtomText
  links?: AtomLink[]
  entries: AtomEntry[]
}

type AtomEntry = {
  id?: string
  title?: AtomText
  updated?: string
  published?: string
  authors?: AtomPerson[]
  contributors?: AtomPerson[]
  categories?: AtomCategory[]
  content?: AtomContent
  links?: AtomLink[]
  rights?: AtomText
  summary?: AtomText
  source?: Partial<AtomFeed>
}

type AtomText      = { type: 'text' | 'html' | 'xhtml'; value: string }
type AtomPerson    = { name: string; uri?: string; email?: string }
type AtomLink      = { href: string; rel?: string; type?: string;
                       hreflang?: string; title?: string; length?: number }
type AtomCategory  = { term: string; scheme?: string; label?: string }
type AtomGenerator = { uri?: string; version?: string; value: string }
type AtomContent   = { type: string; src?: string; value?: string }
```

The native RSS 2/0.91/0.92 and RSS 1.0/0.90 shapes (`Rss2Feed`,
`Rss2Item`, `Rss1Feed`, `Rss1Item` …) are also exported; see
`src/feed.ts` for the full set.


## Format mapping

When converting any RSS dialect to Atom, the plugin makes the following
best-effort mappings:

| RSS source                    | Atom target                                        |
|-------------------------------|----------------------------------------------------|
| `channel/title`               | `feed.title` (`type: 'text'`)                      |
| `channel/description`         | `feed.subtitle` (`type: 'text'`)                   |
| `channel/link`                | `feed.id` and `feed.links[]` (`rel: 'alternate'`)  |
| `channel/copyright`           | `feed.rights`                                      |
| `channel/lastBuildDate`       | `feed.updated`                                     |
| `channel/pubDate`             | `feed.updated` (fallback)                          |
| `channel/managingEditor`      | `feed.authors[0]` (parsed `email (Name)`)          |
| `channel/generator`           | `feed.generator.value`                             |
| `channel/image/url`           | `feed.logo`                                        |
| `item/guid`                   | `entry.id`                                         |
| `item/link` (no `guid`)       | `entry.id` (fallback) and `entry.links[]`          |
| `item/description`            | `entry.summary` (`type: 'html'`)                   |
| `item/pubDate`                | `entry.published` and `entry.updated`              |
| `item/author`                 | `entry.authors[0]`                                 |
| `item/enclosure`              | `entry.links[]` with `rel: 'enclosure'`            |
| `item/comments`               | `entry.links[]` with `rel: 'replies'`              |
| `item/category`               | `entry.categories[].term` (+ `scheme` from domain) |

For RDF (RSS 1.0/0.90):

| RDF source                    | Atom target                                        |
|-------------------------------|----------------------------------------------------|
| `channel/@rdf:about`          | `feed.id`                                          |
| `channel/title`               | `feed.title`                                       |
| `channel/description`         | `feed.subtitle`                                    |
| `channel/link`                | `feed.links[]` (`rel: 'alternate'`)                |
| `image/url`                   | `feed.logo`                                        |
| `item/@rdf:about`             | `entry.id`                                         |
| `item/title`                  | `entry.title`                                      |
| `item/link`                   | `entry.links[]` (`rel: 'alternate'`)               |

For Atom 0.3 → Atom 1.0 the legacy element names are renamed:
`tagline → subtitle`, `modified → updated`, `issued → published`,
`copyright → rights`.


## Acknowledgments

Conformance testing uses third-party corpora under permissive licenses
(see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for full
attribution):

- [kurtmckee/feedparser](https://github.com/kurtmckee/feedparser) by
  Kurt McKee and Mark Pilgrim — a focused subset of well-formed feed
  samples is vendored at `test/feedparser-wellformed/`.


## License

MIT. Copyright (c) 2021-2025 Richard Rodger and contributors.
