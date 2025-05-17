import {DocumentActionProps} from 'sanity'
import {useClient} from 'sanity'
import {useState} from 'react'
import {useToast} from '@sanity/ui'
import {useDocumentOperation} from 'sanity'

// Configuration constants
const SCHEMA_ID = process.env.SANITY_STUDIO_SCHEMA_ID
if (!SCHEMA_ID) {
  throw new Error('SANITY_STUDIO_SCHEMA_ID environment variable is required')
}
const apiVersion = process.env.SANITY_STUDIO_API_VERSION || 'vX'

export const TranslateAction = (props: DocumentActionProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const client = useClient({
    apiVersion,
  }).withConfig({
    useCdn: false,
  })
  const toast = useToast()
  const {publish} = useDocumentOperation(props.id, props.type)
  const originalDoc = props.published || props.draft
  console.log('props:', props)
  if (!originalDoc) {
    return null
  }
  console.log('originalDoc:', originalDoc)

  // Only show this action for blogPost documents that are in English
  if (props.type !== 'blogPost') {
    return null
  }

  if (
    (props?.published?.language && props.published.language == 'English') ||
    (props?.draft?.language && props.draft.language == 'English')
  ) {
    return null
  }

  const translate = async () => {
    try {
      setIsProcessing(true)
      const documentId = props.id

      console.log('originalDoc:', originalDoc)

      // Use the Translate API to create a Spanish version
      const translatedDoc = await client.agent.action.translate({
        schemaId: SCHEMA_ID,
        documentId: documentId,
        targetDocument: {operation: 'create'},
        fromLanguage: {id: 'en-US', title: 'English'},
        languageFieldPath: 'language',
        toLanguage: {
          id: (originalDoc?.languageOfLocationCode as string) || 'es-ES',
          title: (originalDoc?.languageOfLocation as string) || 'Spanish',
        },
        styleGuide:
          'Translate the content to Spanish while maintaining a natural, engaging tone. Preserve any technical bird-related terms and ensure they are accurately translated. Keep the same structure and formatting as the original.',
      })

      console.log('translatedDoc:', translatedDoc)

      if (translatedDoc?.slug?.current) {
        // Update the slug to include the language code
        await client
          .patch(translatedDoc._id)
          .set({
            'slug.current': `${translatedDoc.slug.current}-${originalDoc?.languageOfLocationCode || 'es-es'}`,
          })
          .commit()
      }

      toast.push({
        status: 'success',
        title: 'Translation Complete!',
        description: `A new ${originalDoc.languageOfLocation || 'Spanish'} version of the blog post has been created.`,
        duration: 5000,
      })
    } catch (err) {
      console.error(err)
      toast.push({
        status: 'error',
        title: 'Translation failed',
        description: `There was an error creating the ${originalDoc.languageOfLocation || 'Spanish'} translation.`,
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
      props.onComplete()
    }
  }

  return {
    label:
      isProcessing || isPublishing
        ? 'Processing...'
        : `Translate ${originalDoc.languageOfLocation ? `to ${originalDoc.languageOfLocation}` : 'to Spanish'}`,
    tone: isProcessing || isPublishing ? 'positive' : ('primary' as const),
    onHandle: async () => {
      setIsProcessing(true)
      if (props.draft) {
        setIsPublishing(true)
        publish.execute()
      } else {
        await translate()
      }
    },
  }
}
