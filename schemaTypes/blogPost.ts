import {defineType} from 'sanity'

export default defineType({
  name: 'blogPost',
  title: 'Blog Posts',
  type: 'document',
  fields: [
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
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
    },
    {
      name: 'body',
      title: 'Body',
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
