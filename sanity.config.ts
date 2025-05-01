import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {DoneBirdingAction} from './src/DoneBirdingAction'
import {embeddingsIndexDashboard} from '@sanity/embeddings-index-ui'
import {assist} from '@sanity/assist'

export default defineConfig({
  name: 'default',
  title: "Kenbo's Bird Blog",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'z9f8jiwh',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [structureTool(), visionTool(), assist(), embeddingsIndexDashboard()],

  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'checklist') {
        return [DoneBirdingAction, ...prev]
      }
      return prev
    },
  },

  schema: {
    types: schemaTypes,
  },
})
