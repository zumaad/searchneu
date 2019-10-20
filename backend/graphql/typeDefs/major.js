import { gql } from 'apollo-server';

const typeDef = gql`
  extend type Query {
    major(subject: String!): Major
  }

  type Major {
    name: String
    requirementGroups: [RequirementGroup]
    yearVersion: Int
    totalCreditsRequired: Int
    planOfStudies: [Schedule]
  }

  type RequirementGroup {
    type: String
    name: String
    requirements: [JSON]
    numCreditsMin: Int
    numCreditsMax: Int
  }

  type Schedule {
    scheduleYears: [ScheduleYear]
  }

  type ScheduleYear {
    year: Int
    terms: [ScheduleTerm]
    fall: ScheduleTerm
    spring: ScheduleTerm
    summer1: ScheduleTerm
    summer2: ScheduleTerm
  }

  type ScheduleTerm {
    termId: String
    season: String
    year: Int
    classes: ClassOccurrence
  }
`;

export default typeDef;
