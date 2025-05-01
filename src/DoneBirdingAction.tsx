import {DocumentActionProps} from 'sanity'
import {createClient} from '@sanity/client'
import {useState, useEffect} from 'react'
import {useDocumentOperation} from 'sanity'
import {useToast} from '@sanity/ui'

// Type augmentation for Sanity Client to include AI agent capabilities
declare module '@sanity/client' {
  interface SanityClient {
    agent: {
      action: {
        generate: (params: any) => Promise<any>
      }
    }
  }
}

// Configuration constants
const SANITY_TOKEN = process.env.SANITY_STUDIO_SANITY_TOKEN || '<YOUR_SANITY_TOKEN>'
const SCHEMA_ID = process.env.SANITY_STUDIO_SCHEMA_ID
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'z9f8jiwh'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'
const apiVersion = process.env.SANITY_STUDIO_API_VERSION || 'vX'

// Initialize Sanity client
const client = createClient({
  projectId,
  dataset,
  token: SANITY_TOKEN,
  apiVersion,
  useCdn: false,
})

export const DoneBirdingAction = (props: DocumentActionProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const {publish} = useDocumentOperation(props.id, props.type)
  const toast = useToast()

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
        await handleProcessing()
      }
    }
    handlePublishComplete()
  }, [props.draft])

  // Process the birding checklist
  const handleProcessing = async () => {
    try {
      // Step 1: Extract birds from checklist notes
      const gatherBirdsFromNotes = await client.agent.action.generate({
        documentId: props.id,
        instruction: `
          Gather all the bird species mentioned in this $thisChecklist notes field.
          Check the name of the bird is a proper "common name" and if so return it.
          If not, return the most likely common name.
          Return only an array of the bird's common names.`,
        conditionalPaths: {
          // Needed to access a hidden field
          defaultHidden: false,
        },
        noWrite: true, // Important
        instructionParams: {
          thisChecklist: {
            type: 'groq',
            query: `*[_id == $id][0]{notes}`,
            params: {id: props.id},
          },
        },
        target: {
          // Returning the birds names as an array of strings to 'birdsSeenSeed'.
          include: [
            {
              path: 'birdsSeenSeed',
              operation: 'set',
            },
          ],
        },
        schemaId: SCHEMA_ID,
      })

      // Step 2: Process each identified bird
      if (
        gatherBirdsFromNotes?.birdsSeenSeed &&
        Array.isArray(gatherBirdsFromNotes.birdsSeenSeed)
      ) {
        // Create or update bird documents in parallel
        const birdProcessingPromises = gatherBirdsFromNotes.birdsSeenSeed.map(
          async (commonName: string) => {
            const birdId = commonName.toLowerCase().replace(/\s+/g, '-')

            // Step 2a: Create bird document if it doesn't exist
            await client.createIfNotExists({
              _id: birdId,
              _type: 'bird',
              commonName: commonName,
            })

            // Step 2b: Generate detailed bird information using AI
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
          },
        )

        // Wait for all bird processing to complete
        const birdReferences = await Promise.all(birdProcessingPromises)

        // Step 3: Update checklist with array bird references
        if (props.id) {
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

        // Step 4: Generate blog post with checklist details and bird references
        await client.agent.action.generate({
          createDocument: {_type: 'blogPost'},
          instruction: `
            - Write a blog post based on all the info from this checklist: $thisChecklist.
            - Make sure the blog post is very detailed about the birds seen and the location and date of the checklist.
            - Anywhere a bird is mentioned make it bold.
            - for the 'image' field, create an epic action packed anime Dragonball Z style image in the location of $thisChecklist featuring all the birds seen and each bird must have a text label of its common name.  All the birds must be battling each other.  Add me, Ken Jones, to the image. I am a bald goofy looking 30-something year old black adult male.  If $thisChecklist doesn't describe what Im wearing then have me wearing a black shirt that says "Sanity.io" and orange shorts, a backwards hat and binoculars.  If $thisChecklist has a location, use that location for the image.  Otherwise, use the location of the nearest city.  Please add text for Ken's Birding Checklist and the location name and the date (month day, year) of the checklist.  This information about the image must not be used in the blog post body.  If there are details from the $thisChecklist notes about the weather or scenery you must use theme in the image.
            - In the checklist field, reference the $thisChecklist document.`,
          instructionParams: {
            thisChecklist: {
              type: 'groq',
              query: `*[_id == $id][0]{location, date, notes, birdsSeen}`,
              params: {id: props.id},
            },
          },
          schemaId: SCHEMA_ID,
          // async: true,
        })

        // Show success toast
        toast.push({
          status: 'success',
          title: 'Birding checklist processed!',
          description: 'Birds have been documented and blog post has been generated.',
          duration: 15000, // 5 seconds
        })
      }
    } catch (err) {
      console.error(err)
      // Show error toast
      toast.push({
        status: 'error',
        title: 'Processing failed',
        description: 'There was an error processing the birding checklist.',
        duration: 15000, // 5 seconds
      })
    } finally {
      setIsProcessing(false)
      props.onComplete()
    }
  }

  // Return the document action configuration
  return {
    label: isProcessing || isPublishing ? 'Processing...' : 'Done Birding!',
    tone: isProcessing || isPublishing ? 'positive' : 'primary',
    onHandle: async () => {
      setIsProcessing(true)
      setIsPublishing(true)
      publish.execute()
    },
  }
}
