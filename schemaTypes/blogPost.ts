import {defineType} from 'sanity'

export default defineType({
  name: 'blogPost',
  title: 'Blog Posts',
  type: 'document',
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
      name: 'languageOfLocation',
      title: 'Language of Location',
      type: 'string',
    },
    {
      name: 'languageOfLocationCode',
      title: 'Language of Location Code',
      type: 'string',
    },
    {
      name: 'language',
      title: 'Language',
      type: 'string',
    },
    {
      name: 'languageCode',
      title: 'Language Code',
      type: 'string',
    },
    {
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
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
      name: 'profilePictureDescription',
      title: 'Profile Picture Description',
      type: 'text',
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
