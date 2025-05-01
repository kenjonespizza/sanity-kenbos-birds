# Agent action: Generate (API)

# What it is

**Business need**: A way to invoke pre-defined AI instructions for a document.

**Acceptable solve for now:** AI assist like imagined today, but with instructions-as-code. Invoking an instruction programmatically will trigger the exact same code-paths as AI Assist plugin invoked from Studio (aside for some minor details): LLM response will be streamed as field patches to content lake, and fake-presence will show where things are happening in the studio. You’ll have image generation and references if the schema is so configured.

Related:

[Agent actions: Transform & Translate (API)](https://www.notion.so/Agent-actions-Transform-Translate-API-15b78d055b9480a39d32d58ba709e7f9?pvs=21)

### **A birds-eye-view implementation**

- `sanity deploy` ⇒ stores workspace schemas in the target datasets
- `POST /agent/action/generate`
- `editorial-ai-backend` will assemble the state it needs from dataset and request params, then work like it does for Studio invoked instructions

The dev will need to come armed with `projectId` , `dataset` , `token` and `schemaId` (as logged by CLI command)

# Implementation docs

This section assumes the developer has already deployed one or more workspace schemas using the new CLI commands (or sanity deploy).

### How to test

The api is now available in prod under /vX

Routes AND client names will change: pending final call from marketing.

### Configure a studio

- In a studio, install the CLI package: `npm install sanity` (need `3.81.0` or later)
- In your shell, run `export SANITY_CLI_SCHEMA_STORE_ENABLED=true`
  - (or make sure that this env is set for all commands)

### Deploy the schema

<aside>
ℹ️

For now you can only deploy workspaces that have the same projectId as `sanity.cli.ts` uses.

</aside>

Again, env var must be set: `SANITY_CLI_SCHEMA_STORE_ENABLED=true`

- Run `sanity deploy`
- OR
- Run the new `sanity schema deploy`
- After either of these, run `sanity schema list` – this will list all available schemaIds.
- (Alternatively, use `—verbose` with `deploy` or `store`, and the schemaIds will be logged)

Notice the logged `schemaId`s , you’ll need them next.

### Test the API with Sanity Client in staging

### Example test script

**Install the tagged release of Sanity Client**

`npm i @sanity/client@generate`

(Needs to be at least `6.29.0-generate.2`)

```jsx
import {createClient} from '@sanity/client'

/* You need to bring these yourself*/
const projectId = ''
const dataset = ''
const token = ''
const schemaId = ''

/* must be in the deployed schema*/
const documentType = 'article'

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: 'vX',
  useCdn: false,
  apiHost: 'https://api.sanity.work',
})

async function runScript() {
  await client.agent.action.generate({
    createDocument: {_type: documentType},
    instruction: `Write an interesting article titled $title.`,
    instructionParams: {
      title: {type: 'constant', value: 'What is Sanity Agent Action: Generate?'},
    },
    schemaId,
  })
}

runScript().catch(console.error)
```

### `curl`

Note: you still have to store the schema for the target studio like described above.

```tsx
curl -X POST https://<projectId>.api.sanity.work/vX/agent/action/generate/<dataset> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <projectToken>" \
  -d '{
    "createDocument": {"_type": "<documentType>"},
    "instruction": "Fill out the document.",
    "schemaId": "<yourSchemaId>"
  }'
```

## API contract

NOTE: this URL might change before we ship – prefer using the client api as an insulator for change.

`POST https://<projectId>.sanity.io/vX/agent/action/generate/<dataset>`

```tsx
// npm i @sanity/client@instruct
const response = await sanityClient.agent.action.generate({
  /* request parameters */
})
```

For concrete example usage, see below.

//Request shape

In the interest of reducing double book-keeping please read the types & TSDocs
here:
[https://github.com/sanity-io/client/pull/1041/files#diff-dfc906ad30107fa20ece8837cbc6b0043127a933000e6801ee857824abd4df51R1](https://github.com/sanity-io/client/pull/1041/files#diff-dfc906ad30107fa20ece8837cbc6b0043127a933000e6801ee857824abd4df51R1)

### Note about returned document value (`async: false`)

The returned document value is _not_ nesseceraly the same as in content-lake:
It is the result of `getDocument` at the start of the request with instruction operations applied in isolation. If the document was concurrently edited while the instruction was running, values will differ.

The `_updatedAt` & `_rev` field in the returned document will be values the server got the document _before_ applying any changes.

## Simple examples

For all `documentId` request, the document _must_ exist in content-lake prior to invoking instruct.

This can be done using the sanityClient, or use `createDocument` parameter instead.

```tsx
await sanityClient.create({
  _id: 'someDocumentId',
  _type: 'someDocumentType',
})
```

### Change existing document

```tsx
{
 documentId: 'someDocumentId',
 schemaId: 'default-schema'
 instruction: 'Populate the document with facts about dogs.'
}

console.log(response) // 200 –
// as the document was mutated, AI presence moves around in the studio
{_id: 'someDocumentId', /* document after instruction has run on it*/}
```

### Target part of the document using `target`

`target` is has a lot of bells and whistles, more on this below.

```tsx
{
 documentId: 'someDocumentId',
 schemaId: 'default-schema'
 instruction: 'Set to Dawg'
 target: {path: ['title']}
}

console.log(response) // 200 –
//{_id: 'someDocumentId', _type: 'someDocumentType', title: 'Dawg'}
```

### Create document

```tsx
{
 createDocument: { /* _id: 'optional' ,*/ _type: 'someDocumentType'},
 schemaId: 'default-schema'
 instruction: 'Set title to Dawg',
}

console.log(response) // 200 –
// as the document was mutated, AI presence moves around in the studio
/*{
	_id: 'generated-id',
	_type: 'someDocumentType',
	title: 'Dawg',
	mightBeChangedField: 'LLM did llm things; we showed it the whole document type'
}*/
```

### Async operation

```tsx
{
 documentId: 'someDocumentId',
 schemaId: 'default-schema'
 instruction: 'Populate the document with facts about dogs.',
 async: true
}

// as the document was mutated, AI presence moves around in the studio
console.log(response) // 201 - {_id: 'someDocumentId'}
```

### noWrite: existing document target

```tsx
{
 noWrite: true,
 documentId: string,
 schemaId: 'default-schema'
 instruction: 'Set title to Dawg',
}

// nothing has been mutated in content-lake
// there is no AI presence in studio, since nothing is being changed
console.log(response) // 200 –
/*{
	_id: 'someDocumentId',
	_type: 'someDocumentType',
	title: 'Dawg',
	mightBeChangedField: 'LLM did llm things; we showed it the whole document type'
}*/
```

### noWrite: new document target

```tsx
{
 noWrite: true,
 createDocument: { _type: 'someDocumentType'},
 schemaId: 'default-schema'
 instruction: 'Set title to Dawg',
}

//nothing is mutated in content-lake
console.log(response) // 200 –
/*{
	_id: 'generated-id',
	_type: 'someDocumentType',
	title: 'Dawg',
	mightBeChangedField: 'LLM did llm things; we showed it the whole document type'
}*/
```

### Handle conditional `hidden` and `readOnly` state

This only applies to schema types that has `hidden` or `readOnly` set as a function in the studio schema. Since it is a bit niche, it is specified outside the `target` in a separate `conditionalPaths`

```tsx
//overriding default state
{
 documentId: 'someDocumentId',
 schemaId: 'default-schema'
 instruction: 'Set to Dawg'
 /*
  * force all conditional readOnly and hidden fields and types to be writeable
  * note: fields and types with explicit readOnly: true or hidden: true  in the schema
  * are not available to AI Assist
  */
 conditionalPaths: {
   defaultReadOnly: false,
   defaultHidden: false
 }
}

console.log(response) // 200 –
//{_id: 'someDocumentId', _type: 'someDocumentType', title: 'Dawg'}
```

```tsx
// setting path specific state
{
 documentId: 'someDocumentId',
 schemaId: 'default-schema'
 instruction: 'Set to Dawg',
 /* assume this has hidden: () => boolean in the schema, normally it will be ignored */
 target: {path: 'someConditionalField'},
 conditionalPaths: {
   paths: [
     /*  these are absolute document paths, regardless of targets*/
     {path: ['someConditionalField'], readOnly: false, hidden: false}
   ]
 }
}

console.log(response) // 200 –
//{_id: 'someDocumentId', _type: 'someDocumentType', title: 'Dawg'}
```

## Controlling output with `target`

`target` controls which parts of the document will be affected by the instruction.
It can be an array, so multiple parts of the document can be separately configured in detail.

`target` enables the following:

- output to to disjointed parts of the schema, with different maxDepth
  - eg, write two levels deep to "object" and 4 levels deeps to "field.array"
- control set vs append behavior on a per path basis
  - eg, set this array here, but append after key in this one, and also append to this text, bitte schön
- control included and exclude fields and array items
  - eg, include title in this object, but description in this nested one over here
- control included and excluded types on per path basis
  - eg, include only string fields in this object, and only my-custom-type items in this arrayp

Omitting `target` implies that the document itself is the root – the full document schema will be used as output.

- a target will only output up to `maxPathDepth` into the schema.
- when multiple targets are provided, they will be coalesced into a single target sharing a common target root. It is therefor an error to provide conflicting include/exclude across targets (ie, include title in one, and exclude it in another)
- target has an `include` array that can be used to further filter and specify nested fields
  - include is recursive (ie, it has include)
- there is also `exclude` , `types.include` and `types.exclude`≈

The `target` can either be an object or array of multiple targets.

Please refer to the TSDocs here for details: [https://github.com/sanity-io/client/pull/1041/files#diff-dfc906ad30107fa20ece8837cbc6b0043127a933000e6801ee857824abd4df51R99](https://github.com/sanity-io/client/pull/1041/files#diff-dfc906ad30107fa20ece8837cbc6b0043127a933000e6801ee857824abd4df51R99)

### Example using all the config

See this unit test (with nonsensical values): [https://github.com/sanity-io/client/pull/1041/files#diff-d02780c2f062abcf8505db670090d74c454de33dcf58974ba92e68db603208a2R2996](https://github.com/sanity-io/client/pull/1041/files#diff-d02780c2f062abcf8505db670090d74c454de33dcf58974ba92e68db603208a2R2996)

### A note on `path`

In the context of this API the following types apply:

```tsx
type Segment = string | {_key: string}
type Path = Segment[]

//these are used for path throughout target and target.include entries
{
  path: Segment | Path
}
```

Ie, path is either a single _Segment_; a field name or an array item by key OR it is a _Path,_ which is an array of segments.

The supports building partial paths via `include` so only parts of the schema can be filtered in or out as needed.

### Write to only some fields

```tsx
//using path
// this sets 'title' field
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'A title for an article about dogs'
 target: {path: ['title']}
}

/*or using include
 this sets:
 - title
 - description */
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: {include: ['title', 'description']}
}

/*or both
 this sets:
 - objectField.title
 - objectField.description */
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: {path: ['objectField'], include: ['title', 'description']}
}

/* or with multiple target paths
 this sets:
 - objectField.title
 - objectField.description
 - people[_key=="someKey"].name //ie, the name of a single item in the people array
*/
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: [
    {path: ['objectField'], include: ['title', 'description']}
    {path: ['people', {_key: 'someKey'}], include: ['name']}
 ]
}

/* disjointed, deeply nested fields from a common target path
 this sets:
 - objectField.nestedObject.title
 - objectField.otherObject.deeplyNested
   - all its children(assuming deeplyNested is an object)
*/
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: {
	 path: 'objectField',
	 include: [
		 {path: ['nestedObject', 'title']},
		 {path: ['otherObject', 'deeplyNested']}
	 ]
 }
}
```

### set or append a field

For each field, the instruction output will either be `set` (overwrite) or `append` .

By default, instruct uses `set` for non-array fields, and `append` for array fields.

This behavior can be controlled using `operation: 'set' | 'append' | 'mixed'` where mixed is the default.

Refer to the TSDocs for details: [https://github.com/sanity-io/client/pull/1041/files#diff-dfc906ad30107fa20ece8837cbc6b0043127a933000e6801ee857824abd4df51R120](https://github.com/sanity-io/client/pull/1041/files#diff-dfc906ad30107fa20ece8837cbc6b0043127a933000e6801ee857824abd4df51R120) on how append works for non-array fields.

```tsx
//append to a field
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: {path: ['title'], operation: 'append'}
}

//append to some fields, set others
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: {
	 include: [
    {path: 'arrayField', operation: 'set'},
    {
	    path: 'object',
	    operation: 'append' // <-- now all children will append, unless they override
	    include: [
	    'title',
      {
        path: 'description',
        operation: 'set' // overrides the operation set for the object, for description
      }
    ]},
	 ]
 }
}

// SPECIAL MENTION: append inside an array
// when operation: 'append', and the target is an array item,
// instruct will treat it as "append after item with key"
// eg, in this example the instruction will output new tags after the abc tag
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Dog tags'
 target: {
	 path: ['tags', {_key: 'abc')],
	 operation: 'append'
  }
}

```

### Only output or write to some types

`types.include` and `types.exclude` applies to immediate children based on type name match

```tsx
//only write to string fields at the document root
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: {types: {include: ['string']}}
}

//only output array items of a certain type:
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: {
	 path: ['body'],
	 types: {include: ['block']}
}
}

// exclude certain array items
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: {
		path: ['body'],
		types: {exclude: ['image']}
 }
}
```

### Controlling output depth

Default: 4

See TSDocs for details: [https://github.com/sanity-io/client/pull/1041/files#diff-dfc906ad30107fa20ece8837cbc6b0043127a933000e6801ee857824abd4df51R155](https://github.com/sanity-io/client/pull/1041/files#diff-dfc906ad30107fa20ece8837cbc6b0043127a933000e6801ee857824abd4df51R155)

```tsx
// only output two field levels deep

// note: array items count as a level,
// so to write to array item fields at least depth 3 is needed
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: {maxPathDepth: 2}
}

// different depths for different parts of the document
{
 createDocument: {_type: 'article'},
 schemaId: 'default-schema'
 instruction: 'Stuff about dogs'
 target: [
	 {path: ['objectField'], maxPathDepth: 2},
	 {path: ['arrayField'], maxPathDepth: 3}
 ]
}
```

## Dynamic instruction

Can use params to populate the instruction.

Each `key` in the params object can be inserted into the template as `$key` .

```tsx
{
 documentId: 'someDocumentId',
 schemaId: 'default-schema'
 instruction: `
   Create a document titled: $title.

   Base the theme on $description.

   Only use facts from $backgroundMaterial.
 `,
 instructionParams: {
   title: {type: 'constant', value: 'The great beyond'},
   // we also support this as a shorthand string constants
	 //title: 'just give it to me straight – like a pear cider made from 100% pears'
 }
   description: {type: 'field', path: ['description'] /* sanity document path*/}
	 backgroundMaterial: {
	    type: 'groq',
	    query: '*[_id=$id][0]'
	    params: {id: 'backgroundDocumentId'}
	 }

	 /
}
console.log(response) // 200 –
/*{_id: 'someDocumentId',
_type: 'someDocumentType',
title: 'The great beyond',
theme: "This story is all about dawgs because thats what the background  material is about"
}*/

```

To insert literal `$` in the instruction string, either a param and insert into the template, or escape the dollar using `\$` (will be `\\$` in a javascript string).

For example, in the javascrpt string `'"\\$escaped" "$unescaped"'` only `unescaped` is a variable. When this string is rendered, the instruction will read `'"$escaped" "contentsOfunescapedVariable"'` .

### instructionParam types

```tsx
export interface ConstantInstructionParam {
  type: 'constant'
  value: string
}

/**
 * Includes a LLM-friendly version of the field value in the instruction
 */
interface FieldInstructionParam {
  type: 'field'
  /*
   * Examples: ['title'], ['array', {_key: 'arrayItemKey'}, 'field']
   */
  path: Path
  /**
   * If omitted, implicitly uses the documentId of the instruction target
   */
  documentId?: string
}

/**
 * Includes a LLM-friendly version of the document in the instruction
 */
interface DocumentInstructionParam {
  type: 'document'
  /**
   * If omitted, implicitly uses the documentId of the instruction target
   */
  documentId?: string
}

/**
 * Includes a LLM-friendly version of GROQ query result in the instruction
 */
interface GroqInstructionParam {
  type: 'groq'
  query: string
  params?: Record<string, string>
}

type InstructionParam =
  | string
  | ConstantInstructionParam
  | FieldInstructionParam
  | DocumentInstructionParam
  | GroqInstructionParam
```

## Detailed example

Using the client, we can now build feedback-loops, or populate full studios with documents in a loop.

Todo: make the example actually interesting/useful.

```tsx
const schemaId = 'default-schema'

const client = createClient({
  projectId,
  dataset,
  token,
  apiVersion: 'vX',
  useCdn: false,
  apiHost: 'https://api.sanity.work',
})

async function instruct(body) {
  return client.agent.action.generate({
    ...body,
    schemaId,
  })
}

// Create article titles – just use an ephemeral document (not stored),
// gives us a structured document back
const {titles} = await instruct({
  noWrite: true, // created document is not stored
  createDocument: {
    _id: 'seed',
    _type: 'background', //assume this type has a string array field named 'titles'
  },
  instruction: 'Create 5 article titles for a website about dogs',
  path: 'titles',
})

//Create articles based on the titles
for (const title of titles) {
  // Generate background material
  const {_id: articleBackgroundId} = await client.create({
    _type: 'articleBackground',
  })
  await instruct({
    documentId: articleBackgroundId,
    instruction: 'Populate the document with interesting facts for an article title $title',
    instructionParams: {
      title,
    },
  })

  await instruct({
    createDocument: {
      _type: 'article',
      // reference the background document
      background: {
        _type: 'reference',
        _id: articleBackgroundId,
      },
    },
    instruction: `
      Write an interesting article titled $title.
      Base the writing on the facts in $backgroundMaterial
      `,
    instructionParams: {
      title,
      backgroundMaterial: {type: 'groq', query: '*[_id=$id]', params: {id: articleBackgroundId}},
    },
  })
}
```

```tsx
{

   createDocument: {_type: 'fsafsd', _id: 'id'},
   instruction: 'Make it about war',
   fields: ['title', 'description']
}

{
    doucumentId: 'id',
    //createDocument: {_type: 'fsafsd'},
   instruction: 'Fill out the seo fields based on',

}
```

## Todo

- More harding
  - Need a timeout on resolving the instructions (massive groq-queries)
  - Probably a million papercuts / missing validation for edge-cases
- ✅ [Sanity client API for type-safe instructions](https://github.com/sanity-io/client/pull/1041) (draft/tagged release=
  - `client.agent.action.generate({/* params */})`
- ~~Support for param `{type: ‘url’, url: ‘https://somewhere/data.json’}` : Will allow scraping a url and include in the instruction~~
  - Not shipping this now – users can do this pre-instruct invocation and pass the page as a constant
- [Kong rate-limiting](https://github.com/sanity-io/kong/pull/760) (not yet in staging, but pr is up)
- 429 limit based on [new billing api](https://linear.app/sanity/issue/ENTX-3069/brokerage-api-capability-to-get-single-product-resource-quotas-usage): needs middleware
- ✅  Debounce presence updates – We now debounce presence and batch primitive array updates
  - GPT-4o is _alot_ faster than GPT-4. When testing the script I got ratelimited by _SANITY_.
    The main culprit is the way presence works; every time the llm enters or exits a field (in the json stream), we mutate a document.

## Bonus

We will ship with integration tests for this endpoint (and for the ui version (finally)).

LLM & Sanity client parts are mocked.

# How-to-use musings

Some ramblings on how to get the best results with this api.

### Being more specific is better

Giving a generic instruction and running it on a full document schema can be hit and miss, because the LLM will have a lot to think about: a potentially massive structure (the document schema), as well as producing good content.

One way to improve outcomes is do use more that one instruct call to populate the document, a bit like perhaps a human would:

1. Make a skeleton document by only outputting to some fields, like title, description and topics
2. Run instructions for “meatier” fields like main document body individually, feeding the result of 1. into the instruction via field parameters
3. Run any summary-like tasks at the end for stuff like seo fields, entity extraction, tags by feeding the full document into the instruction

```tsx
// create an article with title, description and topics
await client.agent.action.generate({
  schemaId,
  documentId: documentId,
  instruction: [
    'Write a compelling article body text based on the following:',
    'Title: $title',
    'Description: $description',
    'Topics: $topics',
  ].join('\n'),
  instructionParams: {
    title: {type: 'field', path: 'title'},
    description: {type: 'field', path: 'description'},
    topics: {type: 'field', path: 'topics'},
  },
  relativeOutputPaths: {
    include: ['title', 'description', 'topics'],
  },
})

await client.agent.action.generate({
  schemaId,
  documentId: documentId,
  instruction: [
    'Write a compelling article body text based on the following:',
    'Title: $title',
    'Description: $description',
    'Topics: $topics',
  ].join('\n'),
  instructionParams: {
    title: {type: 'field', path: 'title'},
    description: {type: 'field', path: 'description'},
    topics: {type: 'field', path: 'topics'},
  },
  relativeOutputPaths: {
    include: ['body'],
  },
})

await client.agent.action.generate({
  schemaId,
  documentId: documentId,
  instruction: [
    'Based on the following article:',
    '$doc',
    '---',
    'Populate the SEO fields so the article becomes relevant for search engines.',
  ].join('\n'),
  instructionParams: {
    doc: {type: 'document'},
  },
  relativeOutputPaths: {
    include: ['seoTitle', 'seoDescription'],
  },
})
```

###

### Possible Gotchas / Protips

- You will need the AI Assist plugin in the studio to get presence. It needs to be initialzed according to the [docs](https://github.com/sanity-io/assist/tree/main/plugin#sanityassist).
- Instruct has the same schema limitations & configuration options as the AI Assist plugin. You must configure your [schema using the same options](https://github.com/sanity-io/assist/tree/main/plugin#schema-configuration) as the plugin provides.
- [Some schema types are not supported](https://github.com/sanity-io/assist/tree/main/plugin#unsupported-types), and will not be changed by AI Assist:
  - most of these limitations are going away (also in Assist, with [3.0.0](https://github.com/sanity-io/assist/pull/67))
- You will need to have AI Assist plugin as a dependency and import it anywhere in your codebase to get type-safe `options.aiAssist` on your schema types. (The plugin provides interface extensions for all `@sanity/types` options)
- ~~Like AI Assist in the Studio, instruct can only overwrite non-array fields, and append to array-like fields (including portable text fields).~~
  - This is no longer a limitation with the new `target` api.

---

# Work notes – read at your own peril

### What it could look like in detail (round 2)

- deployed with `sanity deploy`
  - This now does the following:
    - Build studio
    - Build manifest
    - Deploys studio with manifest
    - Stores the schemas per-workspace in corresponding datasets (sanity. prefix’ed document types, ids with . in them, \_workspace as metadata)
  - `sanity deploy --workspace-schema <workspace-name>` to store the schema separately. All instructions in a workspace will share this schema. Needs manifest-like code, will run slow. If we add support for only getting schema for a single workspace in manifest, then it could run faster for many-workspace setups.
  - `sanity deploy` -schema
  - sanity deploy -workspace-scheam
  - sanity deploy -local -worksapce-schema <wokspace>
  -
- invoke by `POST /tasks/instruct` with a sanity client:
  - `instruction` (the prompt)
    - Format needs some consideration, we need to support putting fields & the document itself in context.
    - We might want to support markdown, html & portable text.
  - `documentId` – the target document for the instruction; where the output goes.
  - `workspace`
  - optional: `path` – the part of the document to affect. If omitted, it implies that the whole document will be written to
  - optional: `conditionalMembers` – state for readOnly/hidden fields (would override instruction-provided state)
  - optional: `outputPaths` – allowlist for which document paths the instruction will be allowed to output to. This is an additional filter to conditionalMembers. These paths should proably be relative to the `path` param
  - The instruction will run using the Robot token (and its permissions) that invoked the endpoint
  -

```tsx
//Example use
for(animal in ['cats', 'dogs']) {
	const doc = await sanityClient.createIfNotExists({
	    _id: 'abc',
	    _type: 'myDocument'
	})

	//this will be a 200 response code:
	// we will hold the request open for the duration
	// this is unlike the studioversion which 201s after validation
	// reasoning: easier to use, and no need to juggle a separate status endpoint for completion
	const response = await sanityClient.request({
	  method: 'POST',
	  uri: '/assist/tasks/instruct',
	  // TODO: determine a format for inserting field and possibly doc inserts
	  body: {
	     documentId: doc._id,
	     instruction: `
	       Populate the document with facts about ${animal}.
	     `
	     //{document:id->title}
	   workspaceId: 'default-myLocalhostVersion',
	  },
	})
}

```

### Thoughts on the `instruction` parameter

//wip section

The power of the api will depend on how easily you can express instructions by combing text and content.

The _cheapest_ option (implementation wise) is to just have it be a string; our users would have to do all the heavy lifting of getting data and putting into the string before calling the api.

The better option is to have some sort of DSL/template language or similar where users can compose an instruction using groq-like paths and document IDs.

### Instruction + params

```tsx
{
   instruction: `
     We want to create a document based on an existing title.
     The title is $title.

     We want the content to be grounded in the following reference material:
     $referenceMaterial

     Also from the internet: $url

	   Populate the document. Use relevant information from the reference material.
   `,
   params: {
      title: {
         // conventience for insterting targetDocument data in the instruction
        type: 'field',
	      path: 'title'
      },
      referenceMaterial: {
        // insert _anything_ from Sanity
        type: 'groq',
	      query: '*[_type=="$type"]',
	      params: {type: 'referenceMaterial'}
      },
      url: {
        // insert from the internet
        type: 'url',
	      url: 'https://www.sanity.io',
      }
   }
}
```

### Things to think about

- **Schema – one or many?**
  - In discussion with @Simen Skogsrud he proposed keeping the schema fully serialized with each function definition document in the target dataset.
  - I propose we have one schema per workspace (could be multiple in a dataset) that is updated during deploy. This should save _us_ a lot of storage space, and our users a lot of waiting time when iterating on an instruction.
  - Downside of a single schema, is that instructions could potentially break if fields are used as instruction path is removed after deploy. I would argue that this is a feature, since writing to fields the studio does not know about is a bug already.
  - The argument for many would be that an instruction could basically have its own schema, if you for instance would like to run instructions on not-in-studio documents or fields. I would say that those things should still be in the document, but conditionally hidden.
- **Browser-node-problem**: This proposal totally sidesteps all problems with getting the schema out of a studio codebase. It will have the same limitations, errors and problems as GQL, TypeGen and Manifest has already.
- **Blueprint/compute compatibility:** What considerations are needed for if/when schemas are part of the blueprint spec? Will these AI Instruction files have to follow some blueprint format already?
- **To create or not create**: Should the backend be allowed to create a new document if the provided id does not exist?
  - AI Assist currently expects Studio to do this before running an instruction. It avoids confusion around draft vs non-draft. With releases there are even more footguns around ids. Perhaps just require the document to exists, and document that createIfMissing has to be performed before invoking a headless assist function?

## Pseudo handwave impl of storing schemas

```tsx
//const manifest = fs.readFile(path/to/create-manifest.json)

function storeManifest(manifest, sanityClient) {

  const projectId = sanityClient.config().projectId
  // manifest.workspaces
	const [workspacesForClientProject, otherWorkspaces] = partionWorkspacesBasedOnProjectId(manifest))

//for Promise.all or something
  workspacesForClientProject.map(async (workspace) => {
    const schema = Json.parse(await readFile(workspace.scheamFile)) as ManifestSchema

   const createDoc = await sanityClient.withConfig({dataset: worksapce.dataset})
		   .createOrReplace({
		      _type: 'sanity.workspace.schema',
		      _id: `${workspace.name}-${cliArgs.customId ?? 'default'}` //needs to also support deploy --local my-custom-scheam-id
			    workspace,
			    schema
		   })

		   //log the ids, so they can be used later
		  // assert sanityClient.getDocument(id)
  })

}
```

## How much work is involved

`editorial-ai-backend` was design to support this use-case from the get go. The main thing preventing instructions from being invoked headless has been:

- We where capped on tokens and bandwidth with our service providers
  - Really no a longer a huge problem, its just a matter of who takes the cost for the inevitable `while(allMyDocuments) aiInstructionAllTheThings` .
  - Would be amazing to get help to add **better rate-limiting and/or monitoring** at the level that makes the most sense (per project/dataset I dunno).
- The instruction endpoint expect a serialized schema as part of the payload
  - Solved by this proposal – we will now get the schema stored for the workspace. This is a very small lift for `editorial-ai-backend` . In fact, there used to be a version that worked exactly like this (schema synced via tool in Studio).
- Need to talk to EntX about adding generic metering for this feature.
- Landing formats and CLI commands
  - This is where I suspect most of the time will be spent

# What it isn't

Snorre’s previous understanding of “AI functions” – all heresy:

- Functions:
  - There’s a JSON file (specification/blueprint) which contains some dependences as input (e.g. “schema”) + a JavaScript code.
    - If there’s no dependencies ⇒ It’s just a plain a function running on our compute platform. Ie, the code will run when triggered using the provided code.
    - I want “Schema” ⇒ This becomes a dependency.
    - I want “AI helpers” ⇒ This becomes a “dependency”
    - I want “Sanity client” ⇒ This becomes a “dependency”
    - Dependencies are inject into the function ⇒ `function myFuction({schema, aiHelper, sanityCLient})`
  - Triggers: HTTP / document events / GROQ
- And then, “AI functions” would become:
  - We produce a bunch of AI library tooling to deal with LLM. This is something you can import into your function.
- Guess what: It’s not!

## Snorre & Holm chattin’

- Holms notes kept for reference
  Alrighty! What is it all about?
  - Programmable invokable.
  Snorre’s previous understanding of “AI functions”:
  - Functions:
    - There’s a JSON file (specification/blueprint) which contains some dependences as input (e.g. “schema”) + a JavaScript code.
      - If there’s no dependencies ⇒ It’s just a plain a function running on our compute platform. Ie, the code will run when triggered using the provided code.
      - I want “Schema” ⇒ This becomes a dependency.
      - I want “AI helpers” ⇒ This becomes a “dependency”
      - I want “Sanity client” ⇒ This becomes a “dependency”
      - Dependencies are inject into the function ⇒ `function myFuction({schema, aiHelper, sanityCLient})`
    - Triggers: HTTP / document events / GROQ
  - And then, “AI functions” would become:
    - We produce a bunch of AI library tooling to deal with LLM. This is something you can import into your function.
  - Guess what: It’s not!
  Our new understanding:
  - We want to do what AI Assist does today, but provide an endpoint and/or invoke it based on other triggers.
    - What does it do today: For a document type, for a location in the document, you can create an instruction to write to that location based on the instruction. The AI Assist tool already today writes directly into the dataset.
    - We don’t actually want the developer to write custom code. What we want is an endpoint where you can invoke this _without_ having to pass in schema/dataset. Instead the endpoint should be “deployed” with these settings implicitly.
    - _If_ Functions have support for “reacting to document lifecycle events” and “call an API endpoint” then it should be composable.
  - We can add this functionality to the editorial AI backend very easily!
    - We can store the schema in a separate document (`sanity.ai-assist.schema`), and then the editorial AI backend can reach out to use this schema. The instructions are already stored in the dataset like this.
    - When you run `sanity deploy` it will take the compiled schema and store it inside the dataset.
    - Note that this is a document which is _only_ for consumption by AI Assist.
  - What this is currently lacking without a proper Schema Store: We have a poor story for local development.
    - We _can_ provide a tool where the user can click a button to upload the schema to the AI Assist system, but it’s a bit hacky.
  Let’s talk more about Riot games and their problems with the compiled schema.

## Quotas and Limits

[Headless AI: Pricing & Limits](https://www.notion.so/Headless-AI-Pricing-Limits-1ab78d055b94807b81e4f4b51f8fd8e7?pvs=21)
