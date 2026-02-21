<script>
  // Mock competitions hub — work in progress
  let showDetails = false;
</script>

<main class="min-h-screen flex items-center justify-center bg-stone-900 p-6">
  <section class="w-full max-w-3xl">
    <div class="neumorph-card p-8 rounded-2xl relative overflow-hidden">
      <div class="construction-stripes" aria-hidden="true"></div>

      <div class="flex items-center gap-6">
        <div class="emoji-wrap">
          <div class="trophy">🏆</div>
        </div>

        <div>
          <h1 class="text-3xl font-extrabold text-stone-100 mb-1">Mock Competitions — Under Construction</h1>
          <p class="text-stone-300">We'll be adding judging tools, mock results, score breakdowns, and practice competitions for local classes.</p>
        </div>
      </div>

      <div class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="neumorph-subcard p-4 rounded-xl">
          <h3 class="text-sm font-semibold text-stone-100 mb-2">Judging</h3>
          <p class="text-stone-300">Interfaces for judges and simple scoring flows.</p>
        </div>

        <div class="neumorph-subcard p-4 rounded-xl">
          <h3 class="text-sm font-semibold text-stone-100 mb-2">Results</h3>
          <p class="text-stone-300">Live results, rankings, and printable sheets.</p>
        </div>

        <div class="neumorph-subcard p-4 rounded-xl">
          <h3 class="text-sm font-semibold text-stone-100 mb-2">Practice</h3>
          <p class="text-stone-300">Run mock events to prepare your students.</p>
        </div>
      </div>

      <div class="mt-8 flex items-center gap-4">
        <button on:click={() => showDetails = !showDetails} class="neumorph-btn px-4 py-2 rounded-lg font-semibold text-stone-100 hover:bg-stone-800 transition duration-300">
          {#if showDetails}Hide Details{:else}Learn More{/if}
        </button>

        <!-- <a href="/signup" class="ml-auto text-sm text-blue-400 font-medium">Sign up for early access →</a> -->
      </div>

      {#if showDetails}
        <div class="mt-6 p-4 bg-stone-800/70 rounded-lg border border-stone-800 neumorph-subcard">
          <ul class="list-inside list-disc text-stone-300 space-y-2">
            <li>Judge dashboard with weighted scoring</li>
            <li>Exportable score sheets and result PDFs</li>
            <li>Training mode with anonymized feedback</li>
          </ul>
        </div>
      {/if}
    </div>
  </section>
</main>

<style>
	.neumorph-card {
		box-shadow: 10px 10px 30px rgba(2,6,23,0.7), -8px -8px 20px rgba(255,255,255,0.02);
		border-radius: 18px;
		border: 1px solid rgba(255,255,255,0.03);
	}
	.neumorph-subcard {
		background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(0,0,0,0.04));
		box-shadow: inset 4px 4px 10px rgba(2,6,23,0.5), inset -4px -4px 8px rgba(255,255,255,0.02);
		border-radius: 12px;
	}
	.neumorph-btn {
		box-shadow: 6px 6px 16px rgba(2,6,23,0.6), -6px -6px 12px rgba(255,255,255,0.02);
		border: 1px solid rgba(255,255,255,0.03);
	}

  .construction-stripes {
    position: absolute;
    inset: -40% 0 -40% 0;
    background-image: linear-gradient(135deg, rgba(255,200,0,0.06) 25%, rgba(255,120,0,0.06) 25%, rgba(255,120,0,0.06) 50%, rgba(255,200,0,0.06) 50%);
    background-size: 56px 56px;
    transform: rotate(-6deg);
    pointer-events: none;
    z-index: 0;
  }
  .neumorph-card > * { position: relative; z-index: 1; }

  .emoji-wrap { width: 64px; height: 64px; display:flex; align-items:center; justify-content:center; }
  .trophy { font-size: 40px; transform: translateY(0); animation: bob 1.8s infinite ease-in-out; }

  @keyframes bob { 0%{transform:translateY(0);}50%{transform:translateY(-6px);}100%{transform:translateY(0);} }

  @media (max-width: 640px) {
    .neumorph-card { padding: 1.25rem; }
    .emoji-wrap { width:48px; height:48px; }
    .trophy { font-size:32px; }
  }
</style>
