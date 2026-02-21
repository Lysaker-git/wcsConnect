<script lang="ts">
    // Define the roadmap data with Title, Description, and Estimated Time.
    // This data is now defined within the component, making it self-contained.
    const roadmapData = [
        { 
            title: 'Page Core Features for Events', 
            description: 'Define the core feature set: user authentication, basic event listing, and profile management.', 
            time: 'Q4 2025' 
        },
        {
            title: 'Stripe Integration for Event Payments',
            description: 'Integrate Stripe to handle event payments securely and efficiently.',
            time: 'Q1 2026'
        },
        { 
            title: 'Page Launch & Initial User Testing', 
            description: 'Launch the initial version of the portal with core features. Collect user feedback for improvements.', 
            time: 'Q1 2026' 
        },
        { 
            title: 'First event on the platform', 
            description: 'Successfully onboard and list the first WCS event on the platform, ensuring all core functionalities are working as intended.', 
            time: 'Q1 2026' 
        },
        {
            title: 'Local classes feature development',
            description: 'Develop and integrate local classes feature, allowing users to find and join classes in their area.',
            time: 'Q2 2026'
        }
    ];

    // Note: getAlignmentClass is not strictly needed for this design but kept for reference
    // function getAlignmentClass(index: number): string {
    //     return index % 2 === 0 ? 'md:left-0 md:text-right' : 'md:right-0 md:text-left';
    // }
</script>

<div class="py-16 bg-stone-900">
    <div class="max-w-4xl mx-auto px-6">
        <h2 class="text-4xl font-extrabold text-stone-100 mb-4 text-center">Development Roadmap</h2>
        <p class="text-xl text-stone-300 mb-16 text-center">
            A look at our planned milestones and estimated timelines for the portal's development.
        </p>

        <!-- Vertical Timeline Container -->
        <div class="relative">
            <!-- Central Vertical Line -->
            <div class="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-amber-700 hidden md:block" style="opacity:0.7"></div>
            
            <!-- Items Loop -->
            {#each roadmapData as item, i}
                <div class="mb-10 flex w-full justify-between items-center relative md:odd:flex-row-reverse">
                    
                    <!-- Milestone Icon (Centered on mobile, hidden on small screens until position is set) -->
                    <div class="z-10 bg-amber-600 w-6 h-6 rounded-full border-4 border-stone-900 shadow-lg mx-auto md:mx-0 absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center justify-center text-xs font-bold text-white">
                        
                    </div>

                    <!-- Content Card Wrapper -->
                    <div class="w-full md:w-[45%] p-6 rounded-xl bg-stone-800 border border-stone-700 transition-all duration-300 {i % 2 === 0 ? 'md:mr-auto' : 'md:ml-auto'}" style="box-shadow: 6px 6px 18px rgba(2,6,23,0.7), -5px -5px 12px rgba(255,255,255,0.02);">
                        
                        <!-- Mobile-only indicator -->
                            <span class="inline-flex md:hidden items-center justify-center w-6 h-6 mb-2 bg-amber-100 text-amber-800 rounded-full text-sm font-bold border border-amber-200">
                             
                        </span>

                        <!-- Time / Status Badge -->
                        <span class="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 mb-2">
                            {item.time}
                        </span>

                        <!-- Content -->
                        <h3 class="text-xl font-bold text-stone-100 mb-2">{item.title}</h3>
                        <p class="text-stone-300 text-sm">{item.description}</p>
                    </div>
                </div>
            {/each}
        </div>
        
        <!-- Final Marker -->
        <div class="text-center mt-16 text-stone-400 text-lg font-medium">
            Next: Local Classes Feature Development & More! Stay tuned for updates.
        </div>
    </div>
</div>
