import {DocumentActionProps} from 'sanity'
import {useClient} from 'sanity'
import {useState} from 'react'
import {useToast} from '@sanity/ui'
import {useDocumentOperation} from 'sanity'
import {Dialog, Stack, Card, Checkbox, Button, Text, Box, Flex} from '@sanity/ui'

// Configuration constants
const SCHEMA_ID = process.env.SANITY_STUDIO_SCHEMA_ID
if (!SCHEMA_ID) {
  throw new Error('SANITY_STUDIO_SCHEMA_ID environment variable is required')
}
const apiVersion = process.env.SANITY_STUDIO_API_VERSION || 'vX'

// Language list from IETF BCP 47 language tags, ordered by global usage
const LANGUAGES = [
  {id: 'zh-CN', title: 'Chinese (China)'}, // Most spoken language
  {id: 'es-ES', title: 'Spanish (Spain)'}, // Second most spoken language
  {id: 'es-MX', title: 'Spanish (Mexico)'}, // Spanish variant
  {id: 'hi-IN', title: 'Hindi (India)'}, // Third most spoken language
  {id: 'ar-SA', title: 'Arabic (Saudi Arabia)'}, // Fourth most spoken language
  {id: 'bn-BD', title: 'Bengali (Bangladesh)'}, // Fifth most spoken language
  {id: 'pt-BR', title: 'Portuguese (Brazil)'}, // Sixth most spoken language
  {id: 'ru-RU', title: 'Russian (Russia)'}, // Seventh most spoken language
  {id: 'ja-JP', title: 'Japanese (Japan)'}, // Eighth most spoken language
  {id: 'de-DE', title: 'German (Germany)'}, // Ninth most spoken language
  {id: 'fr-FR', title: 'French (France)'}, // Tenth most spoken language
  {id: 'ko-KR', title: 'Korean (South Korea)'}, // Eleventh most spoken language
  {id: 'it-IT', title: 'Italian (Italy)'}, // Twelfth most spoken language
  {id: 'tr-TR', title: 'Turkish (Turkey)'}, // Thirteenth most spoken language
  {id: 'vi-VN', title: 'Vietnamese (Vietnam)'}, // Fourteenth most spoken language
  {id: 'id-ID', title: 'Indonesian (Indonesia)'}, // Fifteenth most spoken language
  {id: 'nl-NL', title: 'Dutch (Netherlands)'}, // Sixteenth most spoken language
  {id: 'th-TH', title: 'Thai (Thailand)'}, // Seventeenth most spoken language
  {id: 'sv-SE', title: 'Swedish (Sweden)'}, // Eighteenth most spoken language
]

export const TranslateAction = (props: DocumentActionProps) => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])
  const client = useClient({
    apiVersion,
  }).withConfig({
    useCdn: false,
  })
  const toast = useToast()
  const {publish} = useDocumentOperation(props.id, props.type)
  const originalDoc = props.published || props.draft

  if (!originalDoc) {
    return null
  }

  // Only show this action for blogPost documents that are in English
  if (props.type !== 'blogPost') {
    return null
  }

  if (
    (props?.published?.language && props.published.language !== 'English') ||
    (props?.draft?.language && props.draft.language !== 'English')
  ) {
    return null
  }

  const handleLanguageToggle = (languageId: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(languageId) ? prev.filter((id) => id !== languageId) : [...prev, languageId],
    )
  }

  const translate = async () => {
    try {
      setIsProcessing(true)
      const documentId = props.id

      // Create translations in parallel for all selected languages
      const translationPromises = selectedLanguages.map(async (languageId) => {
        const language = LANGUAGES.find((lang) => lang.id === languageId)
        if (!language) return null

        const translatedDoc = await client.agent.action.translate({
          schemaId: SCHEMA_ID,
          documentId: documentId,
          targetDocument: {operation: 'create'},
          fromLanguage: {id: 'en-US', title: 'English'},
          languageFieldPath: 'languageCode',
          toLanguage: {
            id: language.id,
            title: language.title,
          },
          styleGuide:
            'Translate the content while maintaining a natural, engaging tone. Preserve any technical bird-related terms and ensure they are accurately translated. Keep the same structure and formatting as the original.',
          conditionalPaths: {
            defaultHidden: false,
            defaultReadOnly: false,
          },
        })

        if (translatedDoc?._id) {
          // Set the parent field to the original document's ID
          await client
            .patch(translatedDoc._id)
            .set({
              parent: {
                _type: 'reference',
                _ref: documentId,
              },
            })
            .commit()
        } else {
          console.error('Error creating translation:', translatedDoc)
        }

        if (translatedDoc?.slug?.current) {
          await client
            .patch(translatedDoc._id)
            .set({
              'slug.current': `${translatedDoc.slug.current}-${language.id.toLowerCase()}`,
            })
            .commit()
        }

        return translatedDoc
      })

      const results = await Promise.all(translationPromises)
      const successfulTranslations = results.filter(Boolean)

      toast.push({
        status: 'success',
        title: 'Translation Complete!',
        description: `Successfully created ${successfulTranslations.length} translations.`,
        duration: 5000,
      })
    } catch (err) {
      console.error(err)
      toast.push({
        status: 'error',
        title: 'Translation failed',
        description: 'There was an error creating the translations.',
        duration: 5000,
      })
    } finally {
      setIsProcessing(false)
      setIsDialogOpen(false)
      setSelectedLanguages([])
      props.onComplete()
    }
  }

  return {
    label: isProcessing ? 'Processing...' : 'Translate',
    tone: isProcessing ? 'positive' : ('primary' as const),
    onHandle: async () => {
      if (props.draft) {
        toast.push({
          status: 'info',
          title: 'Publishing document...',
          description: 'Please wait while we publish your document before translation.',
          duration: 5000,
        })
        publish.execute()
      }
      setIsDialogOpen(true)
    },
    dialog: isDialogOpen && {
      type: 'dialog',
      header: 'Select Languages to Translate',
      content: (
        <Stack space={4}>
          <Text size={1}>Select the languages you want to translate this document into:</Text>
          <Card padding={3}>
            <Stack space={3}>
              {LANGUAGES.map((language) => (
                <Card key={language.id} padding={2}>
                  <Flex align="center">
                    <Checkbox
                      id={`lang-${language.id}`}
                      checked={selectedLanguages.includes(language.id)}
                      onChange={() => handleLanguageToggle(language.id)}
                      style={{display: 'block'}}
                    />
                    <Box flex={1} paddingLeft={3}>
                      <Text>
                        <label htmlFor={`lang-${language.id}`}>{language.title}</label>
                      </Text>
                    </Box>
                  </Flex>
                </Card>
              ))}
            </Stack>
          </Card>
          <Flex justify="flex-end" gap={2}>
            <Button
              text="Cancel"
              mode="ghost"
              onClick={() => {
                setIsDialogOpen(false)
                setSelectedLanguages([])
              }}
            />
            <Button
              text="Translate"
              tone="primary"
              disabled={selectedLanguages.length === 0 || isProcessing}
              loading={isProcessing}
              onClick={translate}
            />
          </Flex>
        </Stack>
      ),
    },
  }
}
