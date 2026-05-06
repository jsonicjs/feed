/* Copyright (c) 2021-2025 Richard Rodger and other contributors, MIT License */

import { test, describe } from 'node:test'
import assert from 'node:assert'

import { Jsonic } from 'jsonic'
import { Feed, parseFeed, detect } from '../dist/feed.js'
import type {
  AtomFeed,
  Rss1Feed,
  Rss2Feed,
} from '../dist/feed.js'


// Sample feeds. The Atom 1.0 sample is the canonical example from RFC 4287
// section 1.1. The RSS 2.0 / 0.91 / RDF samples are minimal hand-written
// fixtures that exercise the elements each parser cares about.

const ATOM_10 = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example Feed</title>
  <subtitle>A subtitle.</subtitle>
  <link href="http://example.org/feed/" rel="self"/>
  <link href="http://example.org/"/>
  <updated>2003-12-13T18:30:02Z</updated>
  <author>
    <name>John Doe</name>
    <email>johndoe@example.com</email>
  </author>
  <id>urn:uuid:60a76c80-d399-11d9-b93C-0003939e0af6</id>
  <rights>(c) 2003 John Doe</rights>
  <generator uri="https://example.org/g" version="1.2">Example Toolkit</generator>
  <category term="news"/>
  <entry>
    <title>Atom-Powered Robots Run Amok</title>
    <link href="http://example.org/2003/12/13/atom03"/>
    <link rel="enclosure" type="audio/mpeg" length="1337" href="http://example.org/audio.mp3"/>
    <id>urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a</id>
    <updated>2003-12-13T18:30:02Z</updated>
    <published>2003-12-13T08:29:29-04:00</published>
    <summary>Some text.</summary>
    <content type="html">&lt;p&gt;hi&lt;/p&gt;</content>
    <category term="robots" scheme="http://example.org/cats" label="Robots"/>
  </entry>
</feed>`

const ATOM_03 = `<?xml version="1.0" encoding="utf-8"?>
<feed version="0.3" xmlns="http://purl.org/atom/ns#">
  <title>Example 0.3 Feed</title>
  <tagline>An older feed</tagline>
  <link rel="alternate" type="text/html" href="http://example.org/"/>
  <modified>2003-12-13T18:30:02Z</modified>
  <author><name>Jane</name></author>
  <id>tag:example.org,2003:1</id>
  <entry>
    <title>Old Entry</title>
    <link rel="alternate" type="text/html" href="http://example.org/old"/>
    <id>tag:example.org,2003:2</id>
    <issued>2003-12-13T08:29:29-04:00</issued>
    <modified>2003-12-13T18:30:02Z</modified>
  </entry>
</feed>`

const RSS_20 = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>RSS 2 Sample</title>
    <link>http://example.com/</link>
    <description>RSS 2.0 description</description>
    <language>en-us</language>
    <pubDate>Wed, 13 Dec 2003 18:30:02 GMT</pubDate>
    <lastBuildDate>Wed, 13 Dec 2003 19:30:02 GMT</lastBuildDate>
    <managingEditor>editor@example.com (Edna Editor)</managingEditor>
    <generator>my generator</generator>
    <category domain="cats">News</category>
    <ttl>60</ttl>
    <image>
      <url>http://example.com/logo.png</url>
      <title>Logo</title>
      <link>http://example.com/</link>
      <width>96</width>
      <height>32</height>
    </image>
    <skipHours><hour>0</hour><hour>23</hour></skipHours>
    <skipDays><day>Sunday</day></skipDays>
    <item>
      <title>RSS Item 1</title>
      <link>http://example.com/1</link>
      <description>Item one body</description>
      <author>j@example.com (Jane Doe)</author>
      <category>cats</category>
      <category domain="d2">birds</category>
      <comments>http://example.com/1#comments</comments>
      <enclosure url="http://example.com/1.mp3" length="12345" type="audio/mpeg"/>
      <guid isPermaLink="false">item-1-guid</guid>
      <pubDate>Wed, 13 Dec 2003 18:30:02 GMT</pubDate>
      <source url="http://example.com/source.xml">Source name</source>
    </item>
    <item>
      <title>RSS Item 2</title>
      <link>http://example.com/2</link>
    </item>
  </channel>
</rss>`

const RSS_091 = `<?xml version="1.0" encoding="utf-8"?>
<rss version="0.91">
  <channel>
    <title>RSS 0.91</title>
    <link>http://example.com/</link>
    <description>An old feed</description>
    <language>en-us</language>
    <item>
      <title>Item</title>
      <link>http://example.com/i1</link>
      <description>Body</description>
    </item>
  </channel>
</rss>`

const RSS_092 = `<?xml version="1.0" encoding="utf-8"?>
<rss version="0.92">
  <channel>
    <title>RSS 0.92</title>
    <link>http://example.com/</link>
    <description>0.92 feed</description>
    <item>
      <title>Item</title>
      <enclosure url="http://example.com/x.mp3" length="100" type="audio/mpeg"/>
    </item>
  </channel>
</rss>`

const RSS_10 = `<?xml version="1.0"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns="http://purl.org/rss/1.0/">
  <channel rdf:about="http://example.org/index.rdf">
    <title>RSS 1.0 Example</title>
    <link>http://example.org/</link>
    <description>An RDF-based feed</description>
    <items>
      <rdf:Seq>
        <rdf:li resource="http://example.org/items/1"/>
      </rdf:Seq>
    </items>
  </channel>
  <item rdf:about="http://example.org/items/1">
    <title>Item One</title>
    <link>http://example.org/items/1</link>
    <description>Item one</description>
  </item>
</rdf:RDF>`

const RSS_090 = `<?xml version="1.0"?>
<rdf:RDF
  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
  xmlns="http://my.netscape.com/rdf/simple/0.9/">
  <channel>
    <title>RSS 0.90</title>
    <link>http://example.org/</link>
    <description>old</description>
  </channel>
  <item>
    <title>Item</title>
    <link>http://example.org/1</link>
  </item>
</rdf:RDF>`


describe('feed - format detection', () => {
  test('detect atom 1.0', () => {
    const root = Jsonic.make().use(require('@jsonic/xml').Xml)(ATOM_10)
    assert.deepEqual(detect(root), { dialect: 'atom', version: 'atom10' })
  })

  test('detect atom 0.3', () => {
    const root = Jsonic.make().use(require('@jsonic/xml').Xml)(ATOM_03)
    assert.deepEqual(detect(root), { dialect: 'atom', version: 'atom03' })
  })

  test('detect rss 2.0', () => {
    const root = Jsonic.make().use(require('@jsonic/xml').Xml)(RSS_20)
    assert.deepEqual(detect(root), { dialect: 'rss', version: 'rss20' })
  })

  test('detect rss 0.92', () => {
    const root = Jsonic.make().use(require('@jsonic/xml').Xml)(RSS_092)
    assert.deepEqual(detect(root), { dialect: 'rss', version: 'rss092' })
  })

  test('detect rss 0.91', () => {
    const root = Jsonic.make().use(require('@jsonic/xml').Xml)(RSS_091)
    assert.deepEqual(detect(root), { dialect: 'rss', version: 'rss091u' })
  })

  test('detect rss 1.0 (rdf)', () => {
    const root = Jsonic.make().use(require('@jsonic/xml').Xml)(RSS_10)
    assert.deepEqual(detect(root), { dialect: 'rdf', version: 'rss10' })
  })

  test('detect rss 0.90 (rdf)', () => {
    const root = Jsonic.make().use(require('@jsonic/xml').Xml)(RSS_090)
    assert.deepEqual(detect(root), { dialect: 'rdf', version: 'rss090' })
  })
})


describe('feed - default Atom output', () => {
  test('atom 1.0 round-trips through Atom output', () => {
    const f = parseFeed(ATOM_10) as AtomFeed
    assert.equal(f.format, 'atom')
    assert.equal(f.version, '1.0')
    assert.equal(f.id, 'urn:uuid:60a76c80-d399-11d9-b93C-0003939e0af6')
    assert.deepEqual(f.title, { type: 'text', value: 'Example Feed' })
    assert.deepEqual(f.subtitle, { type: 'text', value: 'A subtitle.' })
    assert.equal(f.updated, '2003-12-13T18:30:02Z')
    assert.equal(f.authors?.[0].name, 'John Doe')
    assert.equal(f.authors?.[0].email, 'johndoe@example.com')
    assert.deepEqual(f.rights, { type: 'text', value: '(c) 2003 John Doe' })
    assert.equal(f.generator?.value, 'Example Toolkit')
    assert.equal(f.generator?.version, '1.2')
    assert.equal(f.categories?.[0].term, 'news')
    assert.equal(f.links?.length, 2)
    assert.equal(f.links?.[0].rel, 'self')

    const e = f.entries[0]
    assert.equal(e.id, 'urn:uuid:1225c695-cfb8-4ebb-aaaa-80da344efa6a')
    assert.deepEqual(e.title, { type: 'text', value: 'Atom-Powered Robots Run Amok' })
    assert.equal(e.updated, '2003-12-13T18:30:02Z')
    assert.equal(e.published, '2003-12-13T08:29:29-04:00')
    assert.deepEqual(e.summary, { type: 'text', value: 'Some text.' })
    assert.equal(e.content?.type, 'html')
    assert.equal(e.content?.value, '<p>hi</p>')
    assert.equal(e.categories?.[0].term, 'robots')
    assert.equal(e.categories?.[0].label, 'Robots')

    const enclosure = e.links?.find((l) => l.rel === 'enclosure')
    assert.equal(enclosure?.href, 'http://example.org/audio.mp3')
    assert.equal(enclosure?.type, 'audio/mpeg')
    assert.equal(enclosure?.length, 1337)
  })

  test('atom 0.3 maps tagline -> subtitle and modified -> updated', () => {
    const f = parseFeed(ATOM_03) as AtomFeed
    assert.equal(f.format, 'atom')
    assert.equal(f.version, '0.3')
    assert.deepEqual(f.subtitle, { type: 'text', value: 'An older feed' })
    assert.equal(f.updated, '2003-12-13T18:30:02Z')
    const e = f.entries[0]
    assert.equal(e.published, '2003-12-13T08:29:29-04:00')
    assert.equal(e.updated, '2003-12-13T18:30:02Z')
  })

  test('rss 2.0 converts to Atom shape', () => {
    const f = parseFeed(RSS_20) as AtomFeed
    assert.equal(f.format, 'atom')
    assert.deepEqual(f.title, { type: 'text', value: 'RSS 2 Sample' })
    assert.deepEqual(f.subtitle, { type: 'text', value: 'RSS 2.0 description' })
    assert.equal(f.id, 'http://example.com/')
    // updated falls back from lastBuildDate
    assert.equal(f.updated, 'Wed, 13 Dec 2003 19:30:02 GMT')
    assert.equal(f.generator?.value, 'my generator')
    assert.equal(f.logo, 'http://example.com/logo.png')
    assert.equal(f.authors?.[0].email, 'editor@example.com')
    assert.equal(f.authors?.[0].name, 'Edna Editor')
    assert.equal(f.categories?.[0].term, 'News')
    assert.equal(f.categories?.[0].scheme, 'cats')

    const e0 = f.entries[0]
    assert.deepEqual(e0.title, { type: 'text', value: 'RSS Item 1' })
    assert.deepEqual(e0.summary, { type: 'html', value: 'Item one body' })
    assert.equal(e0.id, 'item-1-guid')  // guid wins
    assert.equal(e0.updated, 'Wed, 13 Dec 2003 18:30:02 GMT')
    assert.equal(e0.published, 'Wed, 13 Dec 2003 18:30:02 GMT')
    assert.equal(e0.authors?.[0].email, 'j@example.com')
    assert.equal(e0.authors?.[0].name, 'Jane Doe')
    assert.equal(e0.categories?.length, 2)

    const altLink = e0.links?.find((l) => l.rel === 'alternate')
    assert.equal(altLink?.href, 'http://example.com/1')
    const encLink = e0.links?.find((l) => l.rel === 'enclosure')
    assert.equal(encLink?.href, 'http://example.com/1.mp3')
    assert.equal(encLink?.length, 12345)
    assert.equal(encLink?.type, 'audio/mpeg')
    const reply = e0.links?.find((l) => l.rel === 'replies')
    assert.equal(reply?.href, 'http://example.com/1#comments')

    // entry without guid falls back to link as id
    const e1 = f.entries[1]
    assert.equal(e1.id, 'http://example.com/2')
  })

  test('rss 0.92 / 0.91 convert to Atom', () => {
    const f91 = parseFeed(RSS_091) as AtomFeed
    assert.equal(f91.format, 'atom')
    assert.deepEqual(f91.title, { type: 'text', value: 'RSS 0.91' })
    assert.equal(f91.entries.length, 1)

    const f92 = parseFeed(RSS_092) as AtomFeed
    assert.equal(f92.format, 'atom')
    assert.deepEqual(f92.title, { type: 'text', value: 'RSS 0.92' })
    assert.equal(f92.entries[0].links?.[0].rel, 'enclosure')
  })

  test('rss 1.0 (rdf) converts to Atom', () => {
    const f = parseFeed(RSS_10) as AtomFeed
    assert.equal(f.format, 'atom')
    assert.deepEqual(f.title, { type: 'text', value: 'RSS 1.0 Example' })
    assert.deepEqual(f.subtitle, { type: 'text', value: 'An RDF-based feed' })
    assert.equal(f.id, 'http://example.org/index.rdf')
    assert.equal(f.entries.length, 1)
    const e = f.entries[0]
    assert.deepEqual(e.title, { type: 'text', value: 'Item One' })
    assert.deepEqual(e.summary, { type: 'text', value: 'Item one' })
    assert.equal(e.id, 'http://example.org/items/1')
  })

  test('rss 0.90 (rdf) converts to Atom', () => {
    const f = parseFeed(RSS_090) as AtomFeed
    assert.equal(f.format, 'atom')
    assert.deepEqual(f.title, { type: 'text', value: 'RSS 0.90' })
    assert.equal(f.entries.length, 1)
    assert.deepEqual(f.entries[0].title, { type: 'text', value: 'Item' })
  })
})


describe('feed - native output', () => {
  test('rss 2.0 native shape', () => {
    const f = parseFeed(RSS_20, { format: 'native' }) as Rss2Feed
    assert.equal(f.format, 'rss')
    assert.equal(f.version, '2.0')
    assert.equal(f.title, 'RSS 2 Sample')
    assert.equal(f.link, 'http://example.com/')
    assert.equal(f.description, 'RSS 2.0 description')
    assert.equal(f.language, 'en-us')
    assert.equal(f.ttl, 60)
    assert.equal(f.image?.url, 'http://example.com/logo.png')
    assert.equal(f.image?.width, 96)
    assert.deepEqual(f.skipHours, [0, 23])
    assert.deepEqual(f.skipDays, ['Sunday'])
    assert.equal(f.items.length, 2)
    const i0 = f.items[0]
    assert.equal(i0.title, 'RSS Item 1')
    assert.equal(i0.author, 'j@example.com (Jane Doe)')
    assert.equal(i0.guid?.value, 'item-1-guid')
    assert.equal(i0.guid?.isPermaLink, false)
    assert.equal(i0.enclosure?.url, 'http://example.com/1.mp3')
    assert.equal(i0.enclosure?.length, 12345)
    assert.equal(i0.categories?.length, 2)
    assert.equal(i0.categories?.[1].domain, 'd2')
    assert.equal(i0.source?.url, 'http://example.com/source.xml')
    assert.equal(i0.source?.value, 'Source name')
  })

  test('atom 1.0 native shape (already atom)', () => {
    const f = parseFeed(ATOM_10, { format: 'native' }) as AtomFeed
    assert.equal(f.format, 'atom')
    assert.equal(f.version, '1.0')
    assert.equal(f.entries.length, 1)
  })

  test('rss 1.0 native (rdf) shape', () => {
    const f = parseFeed(RSS_10, { format: 'native' }) as Rss1Feed
    assert.equal(f.format, 'rdf')
    assert.equal(f.version, '1.0')
    assert.equal(f.about, 'http://example.org/index.rdf')
    assert.equal(f.title, 'RSS 1.0 Example')
    assert.equal(f.items.length, 1)
    assert.equal(f.items[0].about, 'http://example.org/items/1')
  })
})


describe('feed - raw output', () => {
  test('returns the underlying XmlElement tree', () => {
    const root: any = parseFeed(ATOM_10, { format: 'raw' })
    assert.equal(root.localName, 'feed')
    assert.equal(root.namespace, 'http://www.w3.org/2005/Atom')
    assert.ok(Array.isArray(root.children))
  })
})


describe('feed - Plugin form', () => {
  test('jsonic.feed(src) returns Atom by default', () => {
    const j: any = Jsonic.make().use(Feed)
    const f = j.feed(RSS_20) as AtomFeed
    assert.equal(f.format, 'atom')
    assert.equal(f.entries.length, 2)
  })

  test('jsonic.feed(src) honors plugin options', () => {
    const j: any = Jsonic.make().use(Feed, { format: 'native' })
    const f = j.feed(RSS_20) as Rss2Feed
    assert.equal(f.format, 'rss')
    assert.equal(f.version, '2.0')
  })
})


describe('feed - errors', () => {
  test('unrecognized root element throws', () => {
    assert.throws(() => parseFeed('<not-a-feed/>'), /unrecognized root/)
  })

  test('non-XML input throws', () => {
    assert.throws(() => parseFeed(''), /XML element|jsonic|unexpected/i)
  })
})


describe('feed - xhtml content', () => {
  test('xhtml content extracts inner div body', () => {
    const src = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml">Hi <em>there</em></div></title>
        <content type="xhtml"><div xmlns="http://www.w3.org/1999/xhtml"><p>body <b>here</b></p></div></content>
      </entry>
    </feed>`
    const f = parseFeed(src) as AtomFeed
    const e = f.entries[0]
    assert.equal(e.title?.type, 'xhtml')
    assert.match(e.title?.value || '', /Hi <em.*>there<\/em>/)
    assert.equal(e.content?.type, 'xhtml')
    assert.match(e.content?.value || '', /<p.*?>body <b.*?>here<\/b><\/p>/)
  })
})
