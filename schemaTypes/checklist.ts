import {defineType, defineField, defineArrayMember} from 'sanity'

export default defineType({
  name: 'checklist',
  title: 'Checklists',
  type: 'document',
  fields: [
    {
      name: 'date',
      title: 'Date',
      type: 'datetime',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'location',
      title: 'Location',
      type: 'string',
    },
    {
      name: 'geopoint',
      title: 'Location (Map)',
      type: 'geopoint',
      description: 'Select the location on a map',
    },
    {
      name: 'notes',
      title: 'Notes',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [], // No styles, just lists
          lists: [{title: 'Bullet', value: 'bullet'}],
          marks: {decorators: [], annotations: []}, // No marks
        }),
      ],
      description: 'Just jot down random thoughts about the birdcursion here.',
    },
    {
      name: 'birdsSeenHidden',
      title: 'Birds Seen',
      type: 'array',
      hidden: () => true, // Setting this to hidden with a function allows this to still be used with Sanity's AI
      of: [
        {
          type: 'string',
        },
      ],
    },
    {
      name: 'birdsSeen',
      title: 'Birds Seen',
      type: 'array',
      of: [{type: 'reference', to: [{type: 'bird'}]}],
    },
  ],
  initialValue: {
    date: new Date().toISOString(),
  },
  preview: {
    select: {
      date: 'date',
      location: 'location',
    },
    prepare({date, location}) {
      const dateObj = new Date(date)
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }
      const formattedDate = dateObj.toLocaleDateString('en-US', options)
      // Add ordinal suffix to the day
      const withOrdinal = formattedDate.replace(/(\d+)/, (match) => {
        const num = parseInt(match)
        const suffixes = ['th', 'st', 'nd', 'rd']
        const suffix =
          suffixes[
            num % 10 > 0 && num % 10 <= 3 && (num % 100 < 11 || num % 100 > 13) ? num % 10 : 0
          ]
        return `${num}${suffix}`
      })
      return {
        title: location || 'Untitled Checklist',
        subtitle: withOrdinal,
      }
    },
  },
})
