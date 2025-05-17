import {StructureBuilder} from 'sanity/desk'
import {LuListTodo, LuFileText, LuBird} from 'react-icons/lu'

export const structure = (S: StructureBuilder) =>
  S.list()
    .title('Content')
    .items([
      // Checklists
      S.listItem().title('Checklists').icon(LuListTodo).child(S.documentTypeList('checklist')),

      // Blog Posts with audience-based filtering
      S.listItem()
        .title('Blog Posts')
        .icon(LuFileText)
        .child(
          S.list()
            .title('Blog Posts by Audience')
            .items([
              S.listItem()
                .title('Casual Birders')
                .child(
                  S.documentList()
                    .title('Casual Birders Posts')
                    .filter('_type == "blogPost" && audience == "casual"'),
                ),
              S.listItem()
                .title('Kiddos')
                .child(
                  S.documentList()
                    .title('Kids Posts')
                    .filter('_type == "blogPost" && audience == "kids"'),
                ),
              S.listItem()
                .title('Mature Scientists')
                .child(
                  S.documentList()
                    .title('Scientific Posts')
                    .filter('_type == "blogPost" && audience == "scientific"'),
                ),
              S.divider(),
              S.listItem().title('All Posts').child(S.documentTypeList('blogPost')),
            ]),
        ),

      // Birds
      S.listItem().title('Birds').icon(LuBird).child(S.documentTypeList('bird')),
    ])
