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
  // console.log('props:', props)
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
      console.log('documentId:', documentId)

      const imageInstruction = originalDoc?.image?.instruction
      console.log('imageInstruction:', imageInstruction)

      // Generate kids variant
      // Remove image.asset from originalDoc to avoid duplicate references
      if (originalDoc.image?.asset) {
        delete originalDoc.image
      }
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
          Transform both the title, body, and image prompt into a simplified version for first graders learning about birds and birding.
          - Use simple, clear language that a first grader can understand
          - Explain any technical terms in kid-friendly ways
          - Keep the excitement and wonder of bird watching
          - Include fun facts about the birds mentioned
          - Make it engaging and educational
          - Keep the same overall structure and flow as the original
          - Preserve any bird references and formatting
          - Make the title more engaging and kid-friendly
          - generate a new image prompt.  Keep it similar to the original image prompt, but remove the epic Dragonball Z battle theme and make it look like a kid-friendly illustration.
          - generate a new image
          `,
      })

      // Generate image for kids variant
      // await client.agent.action.generate({
      //   documentId: kidsDoc._id,
      //   instruction: `Create a kid-friendly, colorful illustration featuring the birds mentioned in the content. The image should be playful and educational, perfect for first graders. Include fun elements that make bird watching exciting for children.`,
      //   schemaId: SCHEMA_ID,
      // })

      // Transform scientific variant
      await client.agent.action.transform({
        schemaId: SCHEMA_ID,
        documentId: scientificDoc._id,
        instruction: `
          Transform both the title, body, and image prompt into a technical version for seasoned birders and scientists.
          - Use precise scientific terminology
          - Include detailed observations and measurements
          - Reference scientific names of birds when mentioned
          - Add relevant scientific context about bird behavior and ecology
          - Maintain professional tone while being informative
          - Keep the same overall structure and flow as the original
          - Preserve any bird references and formatting
          - Make the title more technical and scientific
          - generate a new image prompt.  Keep it similar to the original image prompt, but remove the epic Dragonball Z battle theme and make it look like a scientific illustration with a lot of detail and labels.
          - generate a new image
        `,
      })

      // Generate image for scientific variant
      // await client.agent.action.generate({
      //   documentId: scientificDoc._id,
      //   instruction: `Create a detailed, scientific illustration of the birds mentioned in the content. The image should be precise and accurate, showing key identifying features and scientific details that would be valuable for birders and scientists.`,
      //   schemaId: SCHEMA_ID,
      // })

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
