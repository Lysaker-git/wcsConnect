// Dummy Event Data Structure
export const dummyEvents = [
  {
    eventID: 'evt001',
    name: 'Oslo WCS Open',
    dates: { from: '2025-10-10', to: '2025-10-12' },
    location: 'Oslo, Norway',
    venue: 'Oslo Congress Center',
    hotel: 'Grand Hotel Oslo',
    proStaff: [
      { name: 'Jordan Frisbee', role: 'Pro', country: 'USA' },
      { name: 'Tatiana Mollmann', role: 'Pro', country: 'USA' }
    ],
    eventStaff: [
      { name: 'John Doe', role: 'MC', country: 'Norway' },
      { name: 'Jane Smith', role: 'DJ', country: 'Sweden' }
    ],
    priceTiers: [
      { tier: 'Early Bird', until: '2025-08-01', price: 120, tickets: 25 },
      { tier: 'Regular', until: '2025-09-15', price: 150, tickets: 50 },
      { tier: 'Last Minute', until: '2025-10-10', price: 180, tickets: 20 }
    ],
    promoCodes: [
      { code: 'WCS10', discount: 10 },
      { code: 'STUDENT', discount: 20 }
    ],
    store: {
      passes: [
        { name: 'Full Pass', price: 150 },
        { name: 'Party Pass', price: 60 }
      ],
      merch: [
        { name: 'T-shirt', price: 20 },
        { name: 'Mug', price: 10 }
      ]
    },
    eventDirector: { userID: 'user123', name: 'Anna Eventson' },
    competitions: [
      { competitionID: 'comp001', name: 'Open J&J', type: 'Jack and Jill' },
      { competitionID: 'comp002', name: 'Strictly Swing', type: 'Strictly' }
    ],
    infoPackets: [
      { title: 'Welcome', content: 'Welcome to Oslo WCS Open!' },
      { title: 'Schedule', content: 'See the full schedule at ...' }
    ],
    description: 'A premier WCS event in Oslo with top pros and great parties.'
  }
];
