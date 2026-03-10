<script lang="ts">
  import { page } from '$app/stores';

  export let data: {
    profile: {
      firstName: string;
      lastName: string;
      wsdcId: string;
      wsdcLevel: string;
      role: string; // 'leader' | 'follower' | ''
    };
  };

  const LEVEL_ORDER = ['Newcomer', 'Novice', 'Intermediate', 'Advanced', 'All-Star'];

  let firstName = data.profile.firstName;
  let lastName  = data.profile.lastName;

  // Mock competition — replace with real load() data.
  const competition = {
    id: $page.params.competitionId,
    name: 'Lysaker Open 2026',
    divisions: [
      { id: 'newcomer',     label: 'Newcomer J&J',     level: 'Newcomer'     },
      { id: 'novice',       label: 'Novice J&J',        level: 'Novice'       },
      { id: 'intermediate', label: 'Intermediate J&J',  level: 'Intermediate' },
      { id: 'advanced',     label: 'Advanced J&J',      level: 'Advanced'     },
      { id: 'allstar',      label: 'All-Star J&J',      level: 'All-Star'     },
    ],
  };

  // Eligible divisions for this user (at or below their WSDC level)
  const profileLevelIndex  = LEVEL_ORDER.indexOf(data.profile.wsdcLevel);
  const eligibleDivisions  = competition.divisions.filter(
    d => LEVEL_ORDER.indexOf(d.level) <= profileLevelIndex
  );
  const profileDivisionId  = competition.divisions.find(
    d => d.level === data.profile.wsdcLevel
  )?.id ?? '';

  // ── Step 1: Main role (auto from profile) ─────────────────────────────────
  let mainRole: string = data.profile.role || ''; // 'leader' | 'follower' | ''

  // ── Step 2: Main division (auto if role matches profile + level is set) ───
  let mainDivision: string =
    data.profile.role && data.profile.wsdcLevel ? profileDivisionId : '';

  // ── Step 3: Off-role division (optional, shown after steps 1+2 complete) ──
  let offDivision: string = '';

  // Off-role: opposite role, max 2 levels below main division
  $: mainDivLevelIdx = mainDivision
    ? LEVEL_ORDER.indexOf(competition.divisions.find(d => d.id === mainDivision)?.level ?? '')
    : -1;

  $: offRoleOptions = (mainRole && mainDivision && mainDivLevelIdx > 0)
    ? [mainDivLevelIdx - 1, mainDivLevelIdx - 2]
        .filter(i => i >= 0)
        .map(i => competition.divisions.find(d => d.level === LEVEL_ORDER[i]))
        .filter((d): d is NonNullable<typeof d> => d != null)
    : [];

  $: offRoleName = mainRole === 'leader' ? 'Follower' : mainRole === 'follower' ? 'Leader' : '';

  function selectMainRole(role: string) {
    mainRole = mainRole === role ? '' : role;
    offDivision = '';
  }

  function selectMainDiv(id: string) {
    mainDivision = mainDivision === id ? '' : id;
    offDivision = '';
  }

  function selectOffDiv(id: string) {
    offDivision = offDivision === id ? '' : id;
  }

  // Final assignments for submission
  $: leaderDivision   = mainRole === 'leader'   ? mainDivision  : offDivision;
  $: followerDivision = mainRole === 'follower' ? mainDivision  : offDivision;

  $: canSubmit =
    firstName.trim() !== '' &&
    lastName.trim()  !== '' &&
    mainRole         !== '' &&
    mainDivision     !== '';

  // Success state
  let submitted = false;
  let confirmedLeader   = '';
  let confirmedFollower = '';

  function handleSubmit() {
    confirmedLeader   = leaderDivision;
    confirmedFollower = followerDivision;
    // TODO: wire up to POST action once backend is ready
    submitted = true;
  }

  function getDivisionLabel(id: string) {
    return competition.divisions.find(d => d.id === id)?.label ?? id;
  }
</script>

<div class="min-h-screen bg-stone-900 py-14 px-6">
  <div class="max-w-xl mx-auto space-y-6">

    <a href="/competition/{$page.params.competitionId}" class="text-sm text-stone-500 hover:text-stone-300 transition">
      ← Back to competition
    </a>

    <div>
      <h1 class="text-3xl font-extrabold text-stone-100">Register</h1>
      <p class="text-stone-400 text-sm mt-1">{competition.name}</p>
    </div>

    {#if submitted}
      <!-- ─── Success ──────────────────────────────────────────────────────── -->
      <div class="bg-stone-800 rounded-2xl border border-green-700/50 p-8 text-center space-y-4">
        <div class="text-5xl">✅</div>
        <h2 class="text-xl font-bold text-stone-100">You're in!</h2>
        <div class="text-sm text-stone-400 space-y-1">
          {#if confirmedLeader}
            <p>Leader — <strong class="text-stone-200">{getDivisionLabel(confirmedLeader)}</strong></p>
          {/if}
          {#if confirmedFollower}
            <p>Follower — <strong class="text-stone-200">{getDivisionLabel(confirmedFollower)}</strong></p>
          {/if}
        </div>
        <p class="text-xs text-stone-500">Your bib number will be assigned when heats are drawn.</p>
        <a href="/competition/{$page.params.competitionId}"
          class="inline-block mt-2 text-sm text-amber-400 hover:underline">
          View competition →
        </a>
      </div>

    {:else}
      <form on:submit|preventDefault={handleSubmit} class="space-y-4">

        <!-- ── Your details ─────────────────────────────────────────────────── -->
        <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 space-y-4">
          <h2 class="text-sm font-semibold text-stone-400 uppercase tracking-wider">Your details</h2>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="comp-first" class="block text-xs text-stone-500 mb-1.5">First name</label>
              <input id="comp-first" type="text" bind:value={firstName} required
                class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500 text-sm" />
            </div>
            <div>
              <label for="comp-last" class="block text-xs text-stone-500 mb-1.5">Last name</label>
              <input id="comp-last" type="text" bind:value={lastName} required
                class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500 text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-stone-500 mb-1.5">WSDC ID</p>
              <div class="px-4 py-2.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-100 text-sm">
                {data.profile.wsdcId || '—'}
              </div>
            </div>
            <div>
              <p class="text-xs text-stone-500 mb-1.5">WSDC level</p>
              <div class="px-4 py-2.5 rounded-xl bg-stone-900/60 border border-stone-700 text-stone-100 text-sm">
                {data.profile.wsdcLevel || '—'}
              </div>
            </div>
          </div>

          <p class="text-xs text-stone-600">
            WSDC details come from your profile.
            <a href="/profile" class="text-stone-500 hover:text-stone-300 underline">Update profile</a> if anything needs correcting.
          </p>
        </div>

        <!-- ── Step 1: Main role ─────────────────────────────────────────────── -->
        <div class="bg-stone-800 rounded-2xl border {mainRole ? 'border-amber-600/40' : 'border-stone-700'} p-5 space-y-3 transition-colors">
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-stone-700 text-stone-400 text-xs flex items-center justify-center font-bold flex-shrink-0
              {mainRole ? '!bg-amber-600 !text-white' : ''}">1</span>
            <p class="text-sm font-semibold text-stone-100">Main role</p>
            {#if mainRole}
              <span class="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 border border-amber-600/30 capitalize">{mainRole}</span>
            {/if}
          </div>
          <div class="grid grid-cols-2 gap-3">
            {#each ['leader', 'follower'] as role}
              {@const isAuto = role === data.profile.role}
              <button
                type="button"
                on:click={() => selectMainRole(role)}
                class="relative py-3 rounded-xl text-sm font-semibold border transition capitalize
                  {mainRole === role
                    ? 'bg-amber-600 border-amber-500 text-white'
                    : 'bg-stone-900 border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100'}"
              >
                {role}
                {#if isAuto && mainRole === role}
                  <span class="absolute -top-1.5 -right-1.5 text-[9px] bg-stone-700 text-amber-400 rounded-full px-1 leading-4 border border-stone-600">auto</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- ── Step 2: Main division (unlocks after role picked) ─────────────── -->
        {#if mainRole}
          <div class="bg-stone-800 rounded-2xl border {mainDivision ? 'border-amber-600/40' : 'border-stone-700'} p-5 space-y-3 transition-colors">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0
                {mainDivision ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-400'}">2</span>
              <p class="text-sm font-semibold text-stone-100">Division</p>
              {#if mainDivision}
                <span class="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 border border-amber-600/30">
                  {getDivisionLabel(mainDivision)}
                </span>
              {/if}
            </div>

            {#if eligibleDivisions.length === 0}
              <p class="text-xs text-amber-500">
                Set your WSDC level in your <a href="/profile" class="underline">profile</a> to see available divisions.
              </p>
            {:else}
              <div class="flex flex-wrap gap-2">
                {#each eligibleDivisions as div}
                  <button
                    type="button"
                    on:click={() => selectMainDiv(div.id)}
                    class="relative px-3 py-2 rounded-xl text-xs font-medium border transition
                      {mainDivision === div.id
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-stone-900 border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100'}"
                  >
                    {div.label}
                    {#if div.id === profileDivisionId && mainDivision === div.id}
                      <span class="absolute -top-1.5 -right-1.5 text-[9px] bg-stone-700 text-amber-400 rounded-full px-1 leading-4 border border-stone-600">auto</span>
                    {/if}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- ── Step 3: Off-role (optional, unlocks after role + division picked) -->
        {#if mainRole && mainDivision}
          {#if offRoleOptions.length > 0}
            <div class="bg-stone-800 rounded-2xl border {offDivision ? 'border-amber-600/40' : 'border-stone-700'} p-5 space-y-3 transition-colors">
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0
                  {offDivision ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-400'}">3</span>
                <div>
                  <p class="text-sm font-semibold text-stone-100">Off-role <span class="text-stone-500 font-normal text-xs">(optional)</span></p>
                  <p class="text-xs text-stone-600">Enter as {offRoleName} in a lower division</p>
                </div>
                {#if offDivision}
                  <span class="ml-auto text-xs px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-400 border border-amber-600/30">
                    {offRoleName} — {getDivisionLabel(offDivision)}
                  </span>
                {/if}
              </div>
              <div class="flex flex-wrap gap-2">
                {#each offRoleOptions as div}
                  <button
                    type="button"
                    on:click={() => selectOffDiv(div.id)}
                    class="px-3 py-2 rounded-xl text-xs font-medium border transition
                      {offDivision === div.id
                        ? 'bg-amber-600 border-amber-500 text-white'
                        : 'bg-stone-900 border-stone-600 text-stone-300 hover:border-stone-400 hover:text-stone-100'}"
                  >
                    {offRoleName} — {div.label}
                  </button>
                {/each}
              </div>
            </div>
          {:else}
            <!-- Newcomer: no off-role possible -->
            <div class="px-4 py-3 rounded-xl border border-stone-700 bg-stone-800/50 text-xs text-stone-600 text-center">
              No off-role available at {data.profile.wsdcLevel} level.
            </div>
          {/if}
        {/if}

        <button
          type="submit"
          disabled={!canSubmit}
          class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Registration
        </button>

        <p class="text-xs text-stone-600 text-center">
          Bib numbers are assigned when heats are drawn by the organiser.
        </p>
      </form>
    {/if}

  </div>
</div>
