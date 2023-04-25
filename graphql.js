import {
  GraphQLObjectType, // used to create type for documents
  GraphQLId,
  GraphQLString,
  GraphQLSchema,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLID,
} from 'graphql'

// convention is uppercase
const UserType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    // insert fields here
    id: { type: GraphQLId },
    name: { type: GraphQLString },
    email: { type: GraphQLString },
    phone: { type: GraphQLString },
  }),
})

const PostType = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    // insert fields here
    id: { type: GraphQLId },
    name: { type: GraphQLString },
    description: { type: GraphQLString },
    status: { type: GraphQLString },
    // create relationship with user. `creator` is a child of `Post`. Whenever a post is queried, resolver below will run
    creator: {
      type: UserType,
      resolve: (post, args) => {
        return User.findById(post.creatorId) // Post document will have .creatorId field
      },
    },
  }),
})

// create a root query Object. To make a query e.g. get user by ID
const RootQuery = new GraphQLObjectType({
  name: 'RootQueryType', // ?
  // each field's key is the identifier a client uses to make a query/mutation (read up) e.g.:
  fields: {
    // for fetching a single user
    user: {
      type: UserType,
      args: { id: { type: GraphQLId } }, // user's query will provide ID of user
      // resolver function determines what the server sends back. Its function itself return a Promise which it will try to resolve. This will typically be to fetch the requested data. Receives parent=Obj (allows us to access the return data of the resolver that ran just before) and query args
      resolve: (parent, args) => {
        // mongoose query to get the user e.g.:
        return User.findById(args.id)
      },

      /*
      on client:

      fetch single user (id not returned unless specified)
        { 
            user(id: '001') {
              name
              email
            }
        }
        // => { data: { user: { name: ____, email: ____ } } }
      */

      // for fetching all users (should be ordered above...but learning phase!)
      users: {
        type: new GraphQLList(UserType),
        // no args provided in query
        resolve: (parent, args) => {
          return User.find()
        },
      },

      post: {
        type: PostType,
        args: { id: { type: GraphQLId } },
        resolve: (parent, args) => {
          return Post.findById(args.id)
        },
      },

      /*
      on client:

      {
         project(id: 1) {
         name
         description,
         client {
           name
           email
         }
       }
     }
      */

      posts: {
        type: new GraphQLList(PostType),
        resolve: (parent, args) => {
          return Post.find()
        },
      },
    },
  },
})

// Mutations
const mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    // Create a user
    createUser: {
      type: UserType,
      args: {
        // use `GraphQLNonNull` to ensure client has passed a value for a field (?)
        name: { type: GraphQLNonNull(GraphQLString) },
        email: { type: GraphQLNonNull(GraphQLString) },
        phone: { type: GraphQLNonNull(GraphQLString) },
      },
      resolve(parent, args) {
        const { name, email, phone } = args

        return new User({ name, email, phone }).save()
      },
    },
    // Delete a user
    deleteUser: {
      type: UserType,
      args: {
        id: { type: GraphQLNonNull(GraphQLID) },
      },
      resolve: async (parent, args) => {
        const userId = args.id

        const usersPosts = await Post.find({ userId })

        for (post of usersPosts) {
          await post.deleteOne()
        }

        return User.findByIdAndRemove(userId)
      },
    },
    // Create a post
    createPost: {
      type: PostType,
      args: {
        creatorId: { type: GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLNonNull(GraphQLString) },
        status: {
          type: new GraphQLEnumType({
            name: 'PostStatus',
            values: {
              new: { value: 'Not Started' },
              progress: { value: 'In Progress' },
              completed: { value: 'Completed' },
            },
          }),
          defaultValue: 'Not Started',
        },
      },
      resolve(parent, args) {
        return new Post({
          creatorId: args.userId,
          name: args.name,
          description: args.description,
          status: args.status,
        }).save()
      },
    },
    // Delete a post
    deletePost: {
      type: PostType,
      args: {
        id: { type: GraphQLNonNull(GraphQLID) },
      },
      resolve(parent, args) {
        return Post.findByIdAndRemove(args.id)
      },
    },
    // Update a post
    updatePost: {
      type: PostType,
      args: {
        id: { type: GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        description: { type: GraphQLString },
        status: {
          type: new GraphQLEnumType({
            name: 'PostStatusUpdate',
            values: {
              new: { value: 'Not Started' },
              progress: { value: 'In Progress' },
              completed: { value: 'Completed' },
            },
          }),
        },
      },
      resolve(parent, args) {
        return Post.findByIdAndUpdate(
          args.id,
          {
            $set: {
              name: args.name,
              description: args.description,
              status: args.status,
            },
          },
          { new: true }
        )
      },
    },
  },
})

// to be able to use the "RootQuery", we need to export it as part of a schema e.g.:
const Schema = new GraphQLSchema({
  query: RootQuery,
})

export default Schema

/*
e.g. creating a user:

mutation {
  createUser(name: 'Alex', email: 'a@t.com', phone: '07516') {
    id
    name
    email
    phone
  }
}


*/
