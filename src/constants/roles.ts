export const IT_TEAM_ROLES = [
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Developer',
  'QA Engineer',
  'DevOps Engineer',
  'Product Manager',
  'UI/UX Designer',
  'Data Analyst',
] as const

export type ItTeamRole = (typeof IT_TEAM_ROLES)[number]
