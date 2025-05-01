import {defineType} from 'sanity'

export default defineType({
  name: 'bird',
  title: 'Birds',
  type: 'document',
  fields: [
    {
      name: 'commonName',
      title: 'Common Name',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'scientificName',
      title: 'Scientific Name',
      type: 'string',
    },
    {
      name: 'size',
      title: 'Size',
      type: 'string',
      options: {
        list: [
          {title: 'Sparrow-sized or smaller', value: 'Sparrow-sized or smaller'},
          {title: 'Robin-sized', value: 'Robin-sized'},
          {title: 'Crow-sized', value: 'Crow-sized'},
          {title: 'Goose-sized', value: 'Goose-sized'},
          {title: 'Larger than a goose', value: 'Larger than a goose'},
        ],
      },
    },
    {
      name: 'conservationStatus',
      title: 'Conservation Status',
      type: 'string',
      options: {
        list: [
          {title: 'Least Concern', value: 'Least Concern'},
          {title: 'Near Threatened', value: 'Near Threatened'},
          {title: 'Vulnerable', value: 'Vulnerable'},
          {title: 'Endangered', value: 'Endangered'},
          {title: 'Critically Endangered', value: 'Critically Endangered'},
          {title: 'Extinct in the Wild', value: 'Extinct in the Wild'},
          {title: 'Extinct', value: 'Extinct'},
          {title: 'Data Deficient', value: 'Data Deficient'},
        ],
      },
    },
    {
      name: 'color',
      title: 'Color',
      type: 'string',
      options: {
        list: [
          {title: 'Brown', value: 'Brown'},
          {title: 'Gray', value: 'Gray'},
          {title: 'Black', value: 'Black'},
          {title: 'White', value: 'White'},
          {title: 'Red', value: 'Red'},
          {title: 'Yellow', value: 'Yellow'},
          {title: 'Blue', value: 'Blue'},
          {title: 'Green', value: 'Green'},
        ],
      },
    },
    {
      name: 'overallAppearance',
      title: 'Overall Appearance',
      type: 'text',
      description:
        "A detailed description of the bird's physical appearance including plumage, distinctive markings, and any seasonal variations",
    },
    {
      name: 'habitat',
      title: 'Habitat',
      type: 'text',
      description:
        "The bird's preferred habitat, including specific environments and geographic locations",
    },
    {
      name: 'behavior',
      title: 'Behavior',
      type: 'text',
      description:
        "The bird's behavior and habits, including feeding, nesting, and migration patterns",
    },
  ],
})
