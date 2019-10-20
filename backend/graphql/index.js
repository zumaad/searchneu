import { ApolloServer, gql } from 'apollo-server';
import GraphQLJSON from 'graphql-type-json';
import macros from '../macros';

import classResolvers from './resolvers/class';
import majorResolvers from './resolvers/major';

import classTypeDef from './typeDefs/class';
import classOccurrenceTypeDef from './typeDefs/classOccurrence';
import majorTypeDef from './typeDefs/major';


// Enable JSON custom type
const JSONResolvers = {
  JSON: GraphQLJSON,
};

// Base query so other typeDefs can do "extend type Query"
const baseQuery = gql`
  scalar JSON

  type Query {
    _empty: String
  }
`;

const server = new ApolloServer({
  typeDefs: [baseQuery, classTypeDef, classOccurrenceTypeDef, majorTypeDef],
  resolvers: [JSONResolvers, classResolvers, majorResolvers],
});

if (require.main === module) {
  server.listen().then(({ url }) => {
    macros.log(`ready at ${url}`);
  });
}

export default server;
