import express from 'express'
import { graphqlHTTP } from 'express-graphql'
import schema from './schema.js'

const app = express()

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    graphiql: process.env.NODE_ENV === 'development',
  })
)

app.listen(port)
