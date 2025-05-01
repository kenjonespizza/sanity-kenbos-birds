#!/usr/bin/env node
'use strict'

require('dotenv').config()

const {createClient} = require('@sanity/client')

// Augment SanityClient type to include AI agent (for compatibility with the rest of the codebase)
/**
 * @typedef {import('@sanity/client').SanityClient & {
 *   agent?: { action: { generate: Function } }
 * }} SanityClientWithAgent
 */

const SANITY_TOKEN = process.env.SANITY_STUDIO_SANITY_TOKEN || '<YOUR_SANITY_TOKEN>'
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'z9f8jiwh'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'
const apiVersion = process.env.SANITY_STUDIO_API_VERSION || 'vX'

const client = createClient({
  projectId,
  dataset,
  token: SANITY_TOKEN,
  apiVersion,
  useCdn: false,
  perspective: 'previewDrafts',
})

async function main() {
  try {
    console.log('Fetching all checklist documents...')
    const checklists = await client.fetch('*[_type == "checklist"]{_originalId}')
    console.log('checklists:', checklists)
    if (!Array.isArray(checklists) || checklists.length === 0) {
      console.log('No checklist documents found.')
    } else {
      console.log(
        `Found ${checklists.length} checklist documents. Clearing 'birdsSeen' from each...`,
      )
      for (const checklist of checklists) {
        try {
          await client.patch(checklist._originalId).set({birdsSeen: []}).commit()
          console.log(`Cleared 'birdsSeen' in checklist document ${checklist._originalId}`)
        } catch (err) {
          console.error(
            `Failed to clear 'birdsSeen' in checklist document ${checklist._originalId}:`,
            err.message,
          )
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch checklist documents:', err.message)
    process.exit(1)
  }

  try {
    console.log("Deleting all documents of type 'bird'...")
    const deleteResult = await client.delete({query: '*[_type == "bird"]'})
    console.log('Deleted bird documents:', deleteResult)
  } catch (err) {
    console.error('Failed to delete bird documents:', err.message)
    process.exit(1)
  }

  try {
    console.log("Deleting all documents of type 'blogPost'...")
    const deleteBlogPosts = await client.delete({query: '*[_type == "blogPost"]'})
    console.log('Deleted blogPost documents:', deleteBlogPosts)
  } catch (err) {
    console.error('Failed to delete blogPost documents:', err.message)
    process.exit(1)
  }

  console.log('Reset complete.')
}

main()
