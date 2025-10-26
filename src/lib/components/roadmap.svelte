<script lang="ts">
    // Define the roadmap data with Title, Description, and Estimated Time.
    // This data is now defined within the component, making it self-contained.
    const roadmapData = [
        { 
            title: 'Project Kickoff & MVP Definition', 
            description: 'Define the core feature set: user authentication, basic event listing, and profile management.', 
            time: 'Q4 2024' 
        },
        { 
            title: 'Event Registration Integration', 
            description: 'Implement dynamic event detail pages and the user registration flow (including role and partner selection).', 
            time: 'Q1 2025' 
        },
        { 
            title: 'Local Classes Portal Launch', 
            description: 'Create the dedicated local classes listing and registration pages. Focus on geo-tagging.', 
            time: 'Q1 2025' 
        },
        { 
            title: 'WSDC Competition Modules (Phase 1)', 
            description: 'Launch initial competition tracking: heat schedules and basic results viewing.', 
            time: 'Q2 2025' 
        },
        { 
            title: 'Learning Portal Beta Release', 
            description: 'Release the first iteration of the WCS Learning Portal with video hosting and structured courses.', 
            time: 'Q2 2025' 
        },
        { 
            title: 'Mobile-First Optimization', 
            description: 'Comprehensive review and optimization across all pages to ensure seamless mobile responsiveness.', 
            time: 'Q3 2025' 
        },
        { 
            title: 'Partner Matching Feature', 
            description: 'Implement a system allowing users to search for and invite partners for events and competitions.', 
            time: 'Q3 2025' 
        },
        { 
            title: 'User Feedback & Iteration', 
            description: 'Collect and analyze user feedback to prioritize bug fixes and usability improvements.', 
            time: 'Q4 2025' 
        },
        { 
            title: 'Instructor/Organizer Dashboard', 
            description: 'Build a restricted dashboard for organizers to manage their events, classes, and registrations.', 
            time: 'Q1 2026' 
        },
        { 
            title: 'WCS Connect v2.0 - Full Release', 
            description: 'Official launch of all core and advanced features. Begin planning for international expansion.', 
            time: 'Q2 2026' 
        }
    ];

    // Note: getAlignmentClass is not strictly needed for this design but kept for reference
    // function getAlignmentClass(index: number): string {
    //     return index % 2 === 0 ? 'md:left-0 md:text-right' : 'md:right-0 md:text-left';
    // }
</script>

<div class="py-16 bg-gray-50 font-sans">
    <div class="max-w-4xl mx-auto px-6">
        <h2 class="text-4xl font-extrabold text-gray-900 mb-4 text-center">Development Roadmap</h2>
        <p class="text-xl text-gray-600 mb-16 text-center">
            A look at our planned milestones and estimated timelines for the portal's development.
        </p>

        <!-- Vertical Timeline Container -->
        <div class="relative">
            <!-- Central Vertical Line -->
            <div class="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-blue-400 hidden md:block"></div>
            
            <!-- Items Loop -->
            {#each roadmapData as item, i}
                <div class="mb-10 flex w-full justify-between items-center relative md:odd:flex-row-reverse">
                    
                    <!-- Milestone Icon (Centered on mobile, hidden on small screens until position is set) -->
                    <div class="z-10 bg-blue-600 w-6 h-6 rounded-full border-4 border-white shadow-lg mx-auto md:mx-0 absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center justify-center text-xs font-bold text-white">
                        {i + 1}
                    </div>

                    <!-- Content Card Wrapper -->
                    <div class="w-full md:w-[45%] p-6 rounded-xl shadow-lg bg-white border border-gray-200 transition-all duration-300 hover:shadow-xl hover:border-blue-500 {i % 2 === 0 ? 'md:mr-auto' : 'md:ml-auto'}">
                        
                        <!-- Mobile-only indicator -->
                        <span class="inline-flex md:hidden items-center justify-center w-6 h-6 mb-2 bg-blue-100 text-blue-800 rounded-full text-sm font-bold border border-blue-300">
                             {i + 1}
                        </span>

                        <!-- Time / Status Badge -->
                        <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-700 mb-2">
                            {item.time}
                        </span>

                        <!-- Content -->
                        <h3 class="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                        <p class="text-gray-600 text-sm">{item.description}</p>
                    </div>
                </div>
            {/each}
        </div>
        
        <!-- Final Marker -->
        <div class="text-center mt-16 text-gray-500 text-lg font-medium">
            Next: Ongoing Development & User Feedback...
        </div>
    </div>
</div>
