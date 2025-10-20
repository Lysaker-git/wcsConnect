// Dummy Competition Data Structure
export const dummyCompetitions = [
  {
    competitionID: 'comp001',
    eventID: 'evt001',
    competitionName: 'Open J&J',
    type: 'Jack and Jill',
    contestants: [
      { id: 'lead001', name: 'Alex Lead', role: 'Lead' },
      { id: 'follow001', name: 'Sam Follow', role: 'Follow' }
    ],
    judges: [
      { id: 'judge001', name: 'Judge Judy', head: true },
      { id: 'judge002', name: 'Judge Joe', head: false }
    ],
    rounds: [
      {
        round: 1,
        scores: [
          { contestantId: 'lead001', judgeId: 'judge001', score: 8.5 },
          { contestantId: 'follow001', judgeId: 'judge001', score: 8.0 },
          { contestantId: 'lead001', judgeId: 'judge002', score: 8.7 },
          { contestantId: 'follow001', judgeId: 'judge002', score: 8.2 }
        ]
      }
    ],
    description: 'Jack and Jill competition for all levels.'
  }
];
