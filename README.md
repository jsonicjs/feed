# @jsonic/feed

A [Jsonic](https://jsonic.senecajs.org) plugin (built on
[`@jsonic/xml`](https://github.com/jsonicjs/xml)) that parses
syndication feeds — **RSS 0.90, 0.91, 0.92, 1.0, 2.0** and **Atom 0.3,
1.0** — into a typed structure. By default every dialect is normalised
to an Atom-shaped result; pass `format: 'native'` to keep the source
dialect's structure, or `format: 'raw'` to get back the underlying
XML element tree from `@jsonic/xml`.

The same parser is available in two languages:

| Language   | Package                                                        | Source                              |
| ---------- | -------------------------------------------------------------- | ----------------------------------- |
| TypeScript | [`@jsonic/feed`](https://npmjs.com/package/@jsonic/feed)       | [`src/feed.ts`](src/feed.ts)        |
| Go         | [`github.com/jsonicjs/feed/go`](https://github.com/jsonicjs/feed/tree/main/go) | [`go/feed.go`](go/feed.go) |

[![npm version](https://img.shields.io/npm/v/@jsonic/feed.svg)](https://npmjs.com/package/@jsonic/feed)
[![build](https://github.com/jsonicjs/feed/actions/workflows/build.yml/badge.svg)](https://github.com/jsonicjs/feed/actions/workflows/build.yml)


| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |


The documentation below is organised along the
[Diátaxis](https://diataxis.fr) quadrants:

- [Quick start](#quick-start) — tutorial
- [How-to guides](#how-to-guides) — task recipes
- [Reference](#reference) — API surface
- [Format mapping](#format-mapping) — explanation


## Quick start

### TypeScript

```bash
npm install @jsonic/feed jsonic @jsonic/xml
```

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
```

### Go

```bash
go get github.com/jsonicjs/feed/go
```

```go
package main

import (
    "fmt"
    jsonic "github.com/jsonicjs/jsonic/go"
    feed "github.com/jsonicjs/feed/go"
)

func main() {
    j := jsonic.Make()
    if err := j.UseDefaults(feed.Feed, feed.Defaults); err != nil {
        panic(err)
    }
    got, err := j.Parse(`<rss version="2.0">
        <channel>
          <title>My Blog</title>
          <item><title>Hello</title><guid>1</guid></item>
        </channel>
      </rss>`)
    if err != nil {
        panic(err)
    }
    f := got.(feed.AtomFeed)
    fmt.Println(f.Title.Value, "/", f.Entries[0].ID)
}
```


## How-to guides

### Keep the source dialect's structure (no Atom conversion)

TypeScript:

```typescript
import { Jsonic } from 'jsonic'
import { Feed, type Rss2Feed } from '@jsonic/feed'

const j = Jsonic.make().use(Feed, { format: 'native' })
const native = j(rssSource) as Rss2Feed
// native.format === 'rss', native.version === '2.0'
```

Go:

```go
j := jsonic.Make()
j.UseDefaults(feed.Feed, feed.Defaults, map[string]any{"format": "native"})
got, _ := j.Parse(rssSource)
native := got.(feed.Rss2Feed)
// native.Format == "rss", native.Version == "2.0"
```

The native return type is a discriminated union on `format`:

| Input dialect       | Native return type | `format`  | `version`         |
|---------------------|--------------------|-----------|-------------------|
| Atom 1.0 / Atom 0.3 | `AtomFeed`         | `'atom'`  | `'1.0'` / `'0.3'` |
| RSS 2.0 / 0.92 / 0.91 | `Rss2Feed`       | `'rss'`   | `'2.0'` / `'0.92'` / `'0.91'` |
| RSS 1.0 / 0.90      | `Rss1Feed`         | `'rdf'`   | `'1.0'` / `'0.90'` |

### Get the raw XML tree

TypeScript:

```typescript
const j = Jsonic.make().use(Feed, { format: 'raw' })
const tree = j(rssSource)
// tree.localName === 'rss', tree.children === [...]
```

Go:

```go
j := jsonic.Make()
j.UseDefaults(feed.Feed, feed.Defaults, map[string]any{"format": "raw"})
got, _ := j.Parse(rssSource)
tree := got.(map[string]any)
// tree["localName"] == "rss", tree["children"].([]any) == [...]
```

This is the element tree produced by `@jsonic/xml` with no further
processing, useful when you want to handle non-standard extensions.

### Detect a dialect without converting

TypeScript:

```typescript
import { Feed, detect } from '@jsonic/feed'
const j = Jsonic.make().use(Feed, { format: 'raw' })
const { dialect, version } = detect(j(rssSource))
// e.g. { dialect: 'rss', version: 'rss20' }
```

Go:

```go
j := jsonic.Make()
j.UseDefaults(feed.Feed, feed.Defaults, map[string]any{"format": "raw"})
got, _ := j.Parse(rssSource)
det := feed.Detect(got)
// e.g. feed.Detection{Dialect: "rss", Version: "rss20"}
```


## Reference

### TypeScript

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

### Go

```go
func Feed(j *jsonic.Jsonic, opts map[string]any) error
func Detect(root any) Detection

var Defaults = map[string]any{ "format": "atom" }

type Detection struct {
    Dialect string `json:"dialect"`
    Version string `json:"version"`
}
```

Register with `j.UseDefaults(feed.Feed, feed.Defaults, opts)` where
`opts` is a `map[string]any` overriding the defaults. `Parse` then
returns `(any, error)`; type-assert the result to `feed.AtomFeed`,
`feed.Rss2Feed`, or `feed.Rss1Feed` based on the `format` option.

| Key      | Type     | Default  | Effect                                                |
|----------|----------|----------|-------------------------------------------------------|
| `format` | `string` | `"atom"` | Output shape: `"atom"`, `"native"`, or `"raw"`        |

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

The Go structs (`AtomFeed`, `AtomEntry`, `Rss2Feed`, `Rss2Item`,
`Rss1Feed`, `Rss1Item`, …) carry equivalent JSON tags so they marshal
to the same shape. See [`go/feed.go`](go/feed.go) for the full set.


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


## Tests

The TypeScript and Go test suites share fixtures from
[`test/specs/`](test/specs/) — each base name has a `.xml` input and one
or more expected JSON outputs (`.atom.json`, `.native.json`,
`.detect.json`). Both languages enumerate the directory and JSON-compare
the parser result to the expected output, so adding a new fixture is
covered by both immediately.

Both suites also run against a focused subset of well-formed feeds
vendored from [`kurtmckee/feedparser`](https://github.com/kurtmckee/feedparser)
under BSD 2-Clause (see
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)) at
[`test/feedparser-wellformed/`](test/feedparser-wellformed/).


## Acknowledgments

Conformance testing uses third-party corpora under permissive licenses
(see [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for full
attribution):

- [kurtmckee/feedparser](https://github.com/kurtmckee/feedparser) by
  Kurt McKee and Mark Pilgrim — a focused subset of well-formed feed
  samples is vendored at `test/feedparser-wellformed/`.


## License

MIT. Copyright (c) 2021-2025 Richard Rodger and contributors.
