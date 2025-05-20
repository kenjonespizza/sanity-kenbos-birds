import {DocumentActionProps} from 'sanity'
import {useClient} from 'sanity'
import {useState, useEffect} from 'react'
import {useToast} from '@sanity/ui'
import {useDocumentOperation} from 'sanity'

// Configuration constants
const SCHEMA_ID = process.env.SANITY_STUDIO_SCHEMA_ID
if (!SCHEMA_ID) {
  throw new Error('SANITY_STUDIO_SCHEMA_ID environment variable is required')
}
const apiVersion = process.env.SANITY_STUDIO_API_VERSION || 'vX'

export const GenerateAudienceVariantsAction = (props: DocumentActionProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const client = useClient({
    apiVersion,
  }).withConfig({
    useCdn: false,
  })
  const toast = useToast()
  const {publish} = useDocumentOperation(props.id, props.type)

  // Helper function to ensure state updates are processed
  const setIsPublishingAsync = (value: boolean): Promise<void> => {
    return new Promise((resolve) => {
      setIsPublishing(value)
      setTimeout(resolve, 0)
    })
  }

  // Watch for document publishing completion
  useEffect(() => {
    const handlePublishComplete = async () => {
      if (isPublishing && !props.draft) {
        await setIsPublishingAsync(false)
        await generateVariants()
      }
    }
    handlePublishComplete()
  }, [props.draft])

  // Only show this action for blogPost documents with casual audience
  if (props.type !== 'blogPost') {
    return null
  }

  if (
    (props?.published?.audience && props.published.audience !== 'casual') ||
    (props?.draft?.audience && props.draft.audience !== 'casual')
  ) {
    return null
  }

  const generateVariants = async () => {
    try {
      setIsProcessing(true)
      const originalDoc = props.published || props.draft
      if (!originalDoc || !originalDoc.slug?.current) {
        throw new Error('No document found or invalid slug')
      }

      // Get the appropriate document ID based on draft/published state
      const documentId = props.id

      const imageInstruction = originalDoc?.image?.instruction

      // Generate kids variant
      // Remove image.asset from originalDoc to avoid duplicate references
      if (originalDoc.image?.asset) {
        delete originalDoc.image
      }

      const imageInstructionKids = `generate a new image prompt.  Keep the same image prompt, but remove the epic Dragonball Z battle theme and make it look like a kid-friendly illustration.  Be sure to keep Ken Jones african american.`

      const imageInstructionScientific = `generate a new image prompt.  Keep the same image prompt, but remove the epic Dragonball Z battle theme and make it look like a scientific illustration with a lot of detail and labels.`

      const kidsDoc = await client.create({
        ...originalDoc,
        _id: null,
        slug: {
          _type: 'slug',
          current: `${originalDoc.slug.current}-kids`,
        },
        audience: 'kids',
        parent: {
          _type: 'reference',
          _ref: documentId,
        },
        image: {
          instruction: imageInstruction,
        },
      })

      // Generate scientific variant
      const scientificDoc = await client.create({
        ...originalDoc,
        _id: null,
        slug: {
          _type: 'slug',
          current: `${originalDoc.slug.current}-scientific`,
        },
        audience: 'scientific',
        parent: {
          _type: 'reference',
          _ref: documentId,
        },
        image: {
          instruction: imageInstruction,
        },
      })

      // Transform kids variant
      await client.agent.action.transform({
        schemaId: SCHEMA_ID,
        documentId: kidsDoc._id,
        instruction: `
          Transform the title, body, and image prompt fields into a simplified version for first graders learning about birds and birding.
          - Make it engaging and educational
          - Make the title more engaging and kid-friendly
          - ${imageInstructionKids}
          `,
      })

      // Transform scientific variant
      await client.agent.action.transform({
        schemaId: SCHEMA_ID,
        documentId: scientificDoc._id,
        instruction: `
          Transform the title, body, and image prompt fields into a technical version for a science birder.
          - Use precise scientific terminology
          - add the scientific name of the birds in parenthesis after the common name
          - Add relevant scientific context about bird behavior and ecology
          - Maintain professional tone while being informative
          - Make the title more technical and scientific
          - ${imageInstructionScientific}
        `,
      })

      toast.push({
        status: 'success',
        title: 'Content variants generated!',
        description: 'Kids and scientific versions have been created.',
        duration: 5000,
      })
    } catch (err) {
      console.error(err)
      toast.push({
        status: 'error',
        title: 'Generation failed',
        description: 'There was an error generating the content variants.',
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
      props.onComplete()
    }
  }

  return {
    label: isProcessing || isPublishing ? 'Processing...' : 'Generate audience variants',
    tone: isProcessing || isPublishing ? 'positive' : 'primary',
    onHandle: async () => {
      setIsProcessing(true)
      if (props.draft) {
        setIsPublishing(true)
        publish.execute()
      } else {
        await generateVariants()
      }
    },
  }
}
