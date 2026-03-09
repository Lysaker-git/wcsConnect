<script lang="ts">
  import { enhance } from '$app/forms';

  export let data: { events: { id: string; title: string; start_date: string }[] };

  // State
  let selectedEventId = '';
  let subject = '';
  let body = '';

  let recipients: { email: string; username: string }[] = [];
  let loadingRecipients = false;
  let recipientError = '';
  let showRecipients = false;

  let step: 'compose' | 'preview' | 'sent' = 'compose';
  let isSending = false;
  let sendResult: { sent: number; failed: number; errors: string[] } | null = null;

  // Load recipients when event is selected
  async function loadRecipients() {
    if (!selectedEventId) return;
    loadingRecipients = true;
    recipientError = '';
    recipients = [];
    showRecipients = false;

    try {
      const res = await fetch(`/api/admin/mail-recipients?event_id=${selectedEventId}`);
      const data = await res.json();
      if (res.ok && data.recipients) {
        recipients = data.recipients;
      } else {
        recipientError = data.error ?? 'Failed to load recipients';
      }
    } catch {
      recipientError = 'Failed to load recipients';
    }

    loadingRecipients = false;
  }

  // Preview email HTML
  $: previewHtml = body
    ? body
        .split('\n\n')
        .map(p => `<p style="color:#374151;line-height:1.6;margin:0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('')
    : '';

  $: selectedEvent = data.events.find(e => e.id === selectedEventId);

    function goToPreview() {
    const active = testMode ? testRecipients : recipients;
    if (!selectedEventId || !subject || !body || active.length === 0) return;
    step = 'preview';
    }

    let testMode = false;
    let testEmailsRaw = '';
    let testCount = 10;

    $: testRecipients = testMode
    ? testEmailsRaw
        .split('\n')
        .map(e => e.trim())
        .filter(e => e.includes('@'))
        .flatMap(email =>
            Array.from({ length: testCount }, (_, i) => ({
            email,
            username: `Test User ${i + 1}`
            }))
        )
    : recipients;
    $: activeRecipients = testMode ? testRecipients : recipients;
</script>

<div class="max-w-3xl mx-auto space-y-6">

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-stone-100">Mass Email</h1>
      <p class="text-stone-400 text-sm mt-1">Send a message to all participants of an event</p>
    </div>

    {#if step === 'compose'}

      <!-- Event selector -->
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6">
        <label for="mail-event" class="block text-sm font-semibold text-stone-300 mb-2">Select event</label>
        <select
          id="mail-event"
          bind:value={selectedEventId}
          on:change={loadRecipients}
          class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
        >
          <option value="">— Choose an event —</option>
          {#each data.events as event}
            <option value={event.id}>
              {event.title} · {new Date(event.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </option>
          {/each}
        </select>

        {#if loadingRecipients}
          <p class="text-sm text-stone-400 mt-3 flex items-center gap-2">
            <svg class="animate-spin h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading recipients…
          </p>
        {:else if recipientError}
          <p class="text-sm text-red-400 mt-3">{recipientError}</p>
        {:else if recipients.length > 0}
          <div class="mt-3 border border-stone-700 rounded-xl overflow-hidden">
            <button
              type="button"
              on:click={() => showRecipients = !showRecipients}
              class="w-full flex items-center justify-between px-4 py-3 bg-stone-900 hover:bg-stone-750 transition text-left"
            >
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                <span class="text-sm text-green-400 font-medium">{recipients.length} recipients loaded</span>
              </div>
              <svg
                class="w-4 h-4 text-stone-500 transition-transform {showRecipients ? 'rotate-180' : ''}"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {#if showRecipients}
              <div class="max-h-48 overflow-y-auto divide-y divide-stone-700/50">
                {#each recipients as r}
                  <div class="flex items-center justify-between px-4 py-2">
                    <span class="text-sm text-stone-300">{r.username}</span>
                    <span class="text-xs text-stone-500 font-mono">{r.email}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Compose -->
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 space-y-4">
        <h2 class="text-lg font-semibold text-stone-100">Compose</h2>

        <div>
          <label for="mail-subject" class="block text-sm font-medium text-stone-400 mb-1.5">Subject</label>
          <input
            id="mail-subject"
            type="text"
            bind:value={subject}
            placeholder="e.g. Important update about the event"
            class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label for="mail-body" class="block text-sm font-medium text-stone-400 mb-1.5">
            Body
            <span class="text-stone-600 font-normal ml-1">— use blank lines to separate paragraphs. Write {'{{username}}'} to personalise.</span>
          </label>
          <textarea
            id="mail-body"
            bind:value={body}
            rows="10"
            placeholder="Write your message here…"
            class="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 resize-none font-mono text-sm"
          ></textarea>
        </div>
        <!-- Test mode -->
        <div class="border-t border-stone-700 pt-4">
        <label class="flex items-center gap-2 cursor-pointer mb-3">
            <input type="checkbox" bind:checked={testMode} class="rounded border-stone-600 bg-stone-900 text-amber-500" />
            <span class="text-sm font-medium text-stone-300">Test mode</span>
        </label>

        {#if testMode}
            <div class="space-y-3 bg-stone-900 rounded-xl p-4 border border-amber-700/30">
            <p class="text-xs text-stone-400">Sends <strong class="text-stone-300">{testCount}</strong> copies of the email to each test address instead of real recipients.</p>
            
            <div>
                <label for="mail-test-emails" class="block text-xs font-medium text-stone-400 mb-1">Test email addresses <span class="text-stone-600">(one per line)</span></label>
                <textarea
                id="mail-test-emails"
                bind:value={testEmailsRaw}
                rows="3"
                placeholder="you@example.com&#10;colleague@example.com"
                class="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 resize-none text-sm font-mono"
                ></textarea>
            </div>

            <div>
                <label for="mail-test-count" class="block text-xs font-medium text-stone-400 mb-1">Copies per address</label>
                <input
                id="mail-test-count"
                type="number"
                bind:value={testCount}
                min="1"
                max="50"
                class="w-32 px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                />
            </div>

            {#if testRecipients.length > 0}
                <p class="text-xs text-amber-400">⚠️ Will send {testRecipients.length} test emails total — real recipients ignored</p>
            {/if}
            </div>
        {/if}
        </div>

        <button
          on:click={goToPreview}
          disabled={!selectedEventId || !subject || !body || activeRecipients.length === 0 || loadingRecipients}
          class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Preview & confirm →
        </button>
      </div>

    {:else if step === 'preview'}

      <!-- Preview -->
      <div class="bg-stone-800 rounded-2xl border border-amber-700/40 p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold text-stone-100">Review before sending</h2>
          <button
            on:click={() => step = 'compose'}
            class="text-sm text-stone-400 hover:text-stone-100 transition"
          >
            ← Edit
          </button>
        </div>

        <!-- Summary -->
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-stone-900 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-amber-400">{activeRecipients.length}</p>
            <p class="text-xs text-stone-400 mt-1">Recipients</p>
          </div>
          <div class="bg-stone-900 rounded-xl p-4 text-center col-span-2">
            <p class="text-sm font-semibold text-stone-100 truncate">{subject}</p>
            <p class="text-xs text-stone-400 mt-1">Subject</p>
          </div>
        </div>

        <div class="bg-stone-900 rounded-xl p-3">
          <p class="text-xs text-stone-500 mb-1 uppercase tracking-wide font-medium">Event</p>
          <p class="text-sm text-stone-100">{selectedEvent?.title}</p>
        </div>

        <!-- Email preview -->
        <div>
          <p class="text-xs text-stone-500 mb-2 uppercase tracking-wide font-medium">Email preview</p>
          <div class="rounded-xl overflow-hidden border border-stone-700 bg-[#f7f7f7]">
            <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">DancePoint</h1>
            </div>
            <div style="padding:24px;">
              {@html previewHtml}
            </div>
            <div style="padding:16px 24px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;font-family:sans-serif;">© DancePoint · dancepoint.no</p>
            </div>
          </div>
        </div>

        {#if testMode}
        <div class="flex items-center gap-2 px-3 py-1.5 bg-amber-900/30 border border-amber-700/50 rounded-lg">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <p class="text-xs text-amber-300 font-medium">Test mode — real recipients will NOT receive this email</p>
        </div>
        {/if}
    
        <!-- Confirm send -->
        <form
          method="POST"
          action="?/send"
          use:enhance={() => {
            isSending = true;
            return async ({ result, update }) => {
              await update({ reset: false });
              isSending = false;
              if (result.type === 'success') {
                const d = (result as any).data;
                sendResult = { sent: d.sent, failed: d.failed, errors: d.errors ?? [] };
                step = 'sent';
              }
            };
          }}
        >
          <input type="hidden" name="subject" value={subject} />
          <input type="hidden" name="body" value={body} />
          <input type="hidden" name="recipients" value={JSON.stringify(activeRecipients)} />

          <button
            type="submit"
            disabled={isSending}
            class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {#if isSending}
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Sending {activeRecipients.length} emails…
            {:else}
              Send to {activeRecipients.length} recipients
            {/if}
          </button>
        </form>
      </div>

    {:else if step === 'sent'}

      <!-- Result -->
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-8 text-center space-y-4">
        <div class="text-6xl">{sendResult?.failed === 0 ? '✅' : '⚠️'}</div>
        <h2 class="text-2xl font-bold text-stone-100">
          {sendResult?.failed === 0 ? 'All emails sent!' : 'Sent with some errors'}
        </h2>

        <div class="flex justify-center gap-6 mt-4">
          <div class="text-center">
            <p class="text-3xl font-bold text-green-400">{sendResult?.sent}</p>
            <p class="text-xs text-stone-400 mt-1">Sent</p>
          </div>
          {#if (sendResult?.failed ?? 0) > 0}
            <div class="text-center">
              <p class="text-3xl font-bold text-red-400">{sendResult?.failed}</p>
              <p class="text-xs text-stone-400 mt-1">Failed</p>
            </div>
          {/if}
        </div>

        {#if sendResult?.errors && sendResult.errors.length > 0}
          <div class="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-left">
            <p class="text-xs font-semibold text-red-400 mb-2">Errors</p>
            {#each sendResult.errors as err}
              <p class="text-xs font-mono text-red-300">{err}</p>
            {/each}
          </div>
        {/if}

        <button
          on:click={() => { step = 'compose'; subject = ''; body = ''; recipients = []; selectedEventId = ''; sendResult = null; }}
          class="mt-4 px-6 py-3 bg-stone-700 hover:bg-stone-600 text-stone-100 font-semibold rounded-xl transition text-sm"
        >
          Send another
        </button>
      </div>

    {/if}

</div>