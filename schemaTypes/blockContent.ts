import {defineType} from 'sanity'
import {LuBird} from 'react-icons/lu'

export default defineType({
  name: 'blockContent',
  title: 'Block Content',
  type: 'array',
  of: [
    {
      type: 'block',
      marks: {
        annotations: [
          {
            name: 'birdReference',
            type: 'object',
            title: 'Bird Reference',
            icon: LuBird,
            fields: [
              {
                name: 'reference',
                type: 'reference',
                to: [{type: 'bird'}],
                title: 'Bird',
                options: {
                  aiAssist: {
                    embeddingsIndex: 'all-the-things',
                  },
                },
              },
            ],
          },
        ],
      },
    },
  ],
})
