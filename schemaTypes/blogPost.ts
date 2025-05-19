import {defineType} from 'sanity'

type AudienceType = 'casual' | 'kids' | 'scientific'

export default defineType({
  name: 'blogPost',
  title: 'Blog Posts',
  type: 'document',
  preview: {
    select: {
      title: 'title',
      language: 'languageCode',
      audience: 'audience',
    },
    prepare({
      title,
      language,
      audience,
    }: {
      title: string
      language: string
      audience: AudienceType
    }) {
      const audienceMap: Record<AudienceType, string> = {
        casual: 'Casual Birders',
        kids: 'Kiddos',
        scientific: 'Mature Scientists',
      }
      return {
        title,
        subtitle: `${language} • ${audienceMap[audience]}`,
      }
    },
  },
  fields: [
    {
      name: 'parent',
      title: 'Parent',
      type: 'reference',
      to: [{type: 'blogPost'}],
    },
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'languageCode',
      title: 'Language Code',
      type: 'string',
      initialValue: 'en-US',
      readOnly: () => true,
    },
    {
      name: 'audience',
      title: 'Audience',
      type: 'string',
      options: {
        list: [
          {title: 'Casual Birders', value: 'casual'},
          {title: 'Kiddos', value: 'kids'},
          {title: 'Mature Scientists', value: 'scientific'},
        ],
        layout: 'radio',
      },
      initialValue: 'casual',
    },
    {
      name: 'body',
      title: 'Content',
      type: 'blockContent',
    },
    {
      name: 'image',
      title: 'Image',
      type: 'image',
      fields: [
        {
          type: 'text',
          name: 'instruction',
          title: 'Image Prompt',
        },
      ],
      options: {
        aiAssist: {
          imageInstructionField: 'instruction',
        },
      },
    },
    {
      name: 'checklist',
      title: 'Checklist',
      type: 'reference',
      to: [{type: 'checklist'}],
      options: {
        aiAssist: {
          embeddingsIndex: 'all-the-things',
        },
      },
    },
  ],
})
