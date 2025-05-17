import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {CompleteChecklistAction} from './src/documentActions/CompleteChecklist'
import {GenerateAudienceVariantsAction} from './src/documentActions/GenerateAudienceVariants'
import {TranslateAction} from './src/documentActions/TranslateAction'
import {embeddingsIndexDashboard} from '@sanity/embeddings-index-ui'
import {assist} from '@sanity/assist'
import {structure} from './src/structure'
import {googleMapsInput} from '@sanity/google-maps-input'

export default defineConfig({
  name: 'default',
  title: "Kenbo's Bird Blog",

  projectId: process.env.SANITY_STUDIO_PROJECT_ID || 'z9f8jiwh',
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',

  plugins: [
    structureTool({structure}),
    visionTool(),
    assist(),
    embeddingsIndexDashboard(),
    googleMapsInput({
      apiKey: process.env.SANITY_STUDIO_GOOGLE_MAP_API,
    }),
  ],

  document: {
    actions: (prev, context) => {
      if (context.schemaType === 'checklist') {
        return [CompleteChecklistAction, ...prev]
      }
      if (context.schemaType === 'blogPost') {
        return [TranslateAction, GenerateAudienceVariantsAction, ...prev]
      }
      return prev
    },
  },

  schema: {
    types: schemaTypes,
  },
})
