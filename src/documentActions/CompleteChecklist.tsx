import {DocumentActionProps} from 'sanity'
import {useClient} from 'sanity'
import {useState, useEffect, useReducer} from 'react'
import {useDocumentOperation} from 'sanity'
import {useToast} from '@sanity/ui'

// Types
interface BirdReference {
  _type: 'reference'
  _ref: string
}

interface ProcessingState {
  isProcessing: boolean
  isPublishing: boolean
  error: string | null
}

type ProcessingAction =
  | {type: 'START_PROCESSING'}
  | {type: 'START_PUBLISHING'}
  | {type: 'STOP_PROCESSING'}
  | {type: 'SET_ERROR'; payload: string}

// Configuration constants
const SCHEMA_ID = process.env.SANITY_STUDIO_SCHEMA_ID
if (!SCHEMA_ID) {
  throw new Error('SANITY_STUDIO_SCHEMA_ID environment variable is required')
}
const apiVersion = process.env.SANITY_STUDIO_API_VERSION || 'vX'

// Reducer for processing state
const processingReducer = (state: ProcessingState, action: ProcessingAction): ProcessingState => {
  switch (action.type) {
    case 'START_PROCESSING':
      return {...state, isProcessing: true, error: null}
    case 'START_PUBLISHING':
      return {...state, isPublishing: true, error: null}
    case 'STOP_PROCESSING':
      return {...state, isProcessing: false, isPublishing: false}
    case 'SET_ERROR':
      return {...state, error: action.payload}
    default:
      return state
  }
}

export const CompleteChecklistAction = (props: DocumentActionProps) => {
  // Initialize Sanity client
  const client = useClient({
    apiVersion,
  }).withConfig({
    useCdn: false,
  })

  const [state, dispatch] = useReducer(processingReducer, {
    isProcessing: false,
    isPublishing: false,
    error: null,
  })

  const {publish} = useDocumentOperation(props.id, props.type)
  const toast = useToast()

  // Helper function to ensure state updates are processed
  const setIsPublishingAsync = (value: boolean): Promise<void> => {
    return new Promise((resolve) => {
      dispatch({type: value ? 'START_PUBLISHING' : 'STOP_PROCESSING'})
      setTimeout(resolve, 0)
    })
  }

  // Watch for document publishing completion
  useEffect(() => {
    const handlePublishComplete = async () => {
      if (state.isPublishing && !props.draft) {
        await setIsPublishingAsync(false)
        await handleProcessing()
      }
    }
    handlePublishComplete()
  }, [props.draft])

  // Process individual bird
  const processBird = async (commonName: string): Promise<BirdReference> => {
    const birdId = commonName.toLowerCase().replace(/\s+/g, '-')

    // Create bird document if it doesn't exist
    await client.createIfNotExists({
      _id: birdId,
      _type: 'bird',
      commonName: commonName,
    })

    // Generate detailed bird information using AI
    await client.agent.action.generate({
      documentId: birdId,
      instruction: `Create a scientifically accurate bird document for the ${commonName}.`,
      schemaId: SCHEMA_ID,
      async: true,
    })

    return {
      _type: 'reference',
      _ref: birdId,
    }
  }

  // Extract birds from checklist notes
  const extractBirdsFromNotes = async () => {
    const gatherBirdsFromNotes = await client.agent.action.generate({
      documentId: props.id,
      instruction: `
        - Gather all the bird species mentioned in this $thisChecklist.notes.
        - Add the list of birds to the $thisChecklist.birdsSeenSeed field.`,
      conditionalPaths: {
        defaultHidden: false,
      },
      instructionParams: {
        thisChecklist: {
          type: 'groq',
          query: `*[_id == $id][0]{notes}`,
          params: {id: props.id},
        },
      },
      noWrite: true,
      schemaId: SCHEMA_ID,
    })

    return gatherBirdsFromNotes?.birdsSeenSeed || []
  }

  // Update checklist with bird references
  const updateChecklistWithBirds = async (birdReferences: BirdReference[]) => {
    if (!props.id) return

    await client
      .patch(props.id)
      .setIfMissing({birdsSeen: []})
      .set({
        birdsSeen: birdReferences.map((ref, index) => ({
          _key: `${ref._ref}-${index}`,
          ...ref,
        })),
      })
      .commit()
  }

  // Generate blog post from checklist
  const imageInstruction = `For the 'image' field, create an epic action packed anime Dragonball Z style image in the location of $thisChecklist featuring all the birds seen and each bird must have a text label of its common name.  All the birds must be battling each other.  Add me, Ken Jones, to the image. I am a bald goofy looking 30-something year old black adult male.  If $thisChecklist doesn't describe what Im wearing then have me wearing a black shirt that says "Sanity.io" and orange shorts, a backwards hat and binoculars.  If $thisChecklist has a location, use that location for the image.  Otherwise, use the location, city, state, and country of the nearest city.  Please add text for Ken's Birding Checklist and the location name and the date (month day, year) of the checklist.  This information about the image must not be used in the blog post body.  If there are details from the $thisChecklist notes about the weather or scenery you must use theme in the image. Add other details from the notes into the background of the image.
       `

  const generateBlogPost = async (checklistId: string) => {
    await client.agent.action.generate({
      targetDocument: {operation: 'create', _type: 'blogPost'},
      instructionParams: {
        thisChecklist: {
          type: 'groq',
          query: `*[_id == $id][0]{location, date, notes, birdsSeen}`,
          params: {id: checklistId},
        },
      },
      instruction: `
        - Write a blog post in english based on all the info from this checklist: $thisChecklist.
        - Make sure the blog post is very detailed about the birds seen ($thisChecklist.birdsSeen) and the location of the checklist.
        - Anywhere a bird is mentioned make it bold.
        - The languageCode field should be set to en-US.
        - In the checklist field, reference the $thisChecklist document.
        - ${imageInstruction}`,
      schemaId: SCHEMA_ID,
    })
  }

  // Process the birding checklist
  const handleProcessing = async () => {
    try {
      dispatch({type: 'START_PROCESSING'})

      // Step 1: Extract birds from checklist notes
      const birds = await extractBirdsFromNotes()

      if (!Array.isArray(birds) || birds.length === 0) {
        throw new Error('No birds found in checklist notes')
      }

      // Step 2: Process birds
      const birdReferences = await Promise.all(birds.map(processBird))

      // Step 3: Update checklist with bird references
      await updateChecklistWithBirds(birdReferences)

      // Step 4: Generate blog post after checklist is updated
      if (props.id) {
        await generateBlogPost(props.id)
      }

      // Show success toast
      toast.push({
        status: 'success',
        title: 'Birding checklist processed!',
        description: 'Birds have been documented and blog post has been generated.',
        duration: 15000,
      })
    } catch (err) {
      console.error('Processing error:', err)
      dispatch({type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Unknown error'})

      // Show error toast
      toast.push({
        status: 'error',
        title: 'Processing failed',
        description: 'There was an error processing the birding checklist.',
        duration: 15000,
      })
    } finally {
      dispatch({type: 'STOP_PROCESSING'})
      props.onComplete()
    }
  }

  // Return the document action configuration
  return {
    label: state.isProcessing || state.isPublishing ? 'Processing...' : 'Complete Checklist!',
    tone: state.isProcessing || state.isPublishing ? 'positive' : 'primary',
    onHandle: async () => {
      if (props.draft) {
        dispatch({type: 'START_PUBLISHING'})
        publish.execute()
      } else {
        await handleProcessing()
      }
    },
  }
}
