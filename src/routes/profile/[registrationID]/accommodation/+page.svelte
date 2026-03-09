<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { PUBLIC_PAYMENTS_ENABLED } from '$env/static/public';

  export let data: {
    participant: any;
    event: any;
    rooms: any[];
    existingBooking: any;
  };
  export let form: { message?: string } | null = null;

  $: success = $page.url.searchParams.get('success') === 'true';
  $: paymentAbandoned = $page.url.searchParams.get('cancelled') === 'true';

  const { event, rooms, existingBooking, participant } = data;

  let selectedRoom = '';
  let paymentType = 'deposit';
  let showCancelConfirm = false;

  $: room = rooms.find(r => r.id === selectedRoom);
  $: depositPercent = event?.accommodation_deposit_percent ?? 10;
  $: depositAmount = parseFloat((totalAmount * depositPercent / 100).toFixed(2));
  $: remainingAmount = parseFloat((totalAmount - depositAmount).toFixed(2));
  $: chargeAmount = paymentType === 'full' ? totalAmount : depositAmount;
  $: feeModel = event?.stripe_fee_model ?? 'on_top';
  $: handlingFee = feeModel === 'on_top' ? chargeAmount * 0.035 : 0;
  $: serviceFee = chargeAmount * ((event?.platform_fee_percent ?? 1) / 100);
  $: grandTotal = chargeAmount + handlingFee + serviceFee;
  $: currency = room?.currency_type ?? existingBooking?.currency ?? 'EUR';

  $: rem = existingBooking ? parseFloat(existingBooking.remaining_amount) : 0;
  $: remHandlingFee = feeModel === 'on_top' ? rem * 0.035 : 0;
  $: remServiceFee = rem * ((event?.platform_fee_percent ?? 1) / 100);
  $: remGrandTotal = rem + remHandlingFee + remServiceFee;

  // Full payment totals (for unpaid deposit — pay everything at once)
  $: fullAmount = existingBooking ? parseFloat(existingBooking.total_amount) : 0;
  $: fullHandlingFee = feeModel === 'on_top' ? fullAmount * 0.035 : 0;
  $: fullServiceFee = fullAmount * ((event?.platform_fee_percent ?? 1) / 100);
  $: fullGrandTotal = fullAmount + fullHandlingFee + fullServiceFee;

  $: finalDeadline = event?.accommodation_final_payment_deadline
    ? new Date(event.accommodation_final_payment_deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  $: isDeadlinePassed = event?.accommodation_final_payment_deadline
    ? new Date(event.accommodation_final_payment_deadline) < new Date()
    : false;

  $: isCancelled = !!existingBooking?.cancelled_at;

  let checkIn = '';
  let checkOut = '';
  let hotelMembershipId = existingBooking?.hotel_membership_id ?? '';
  let roommateNames: string[] = existingBooking?.roommate_names ?? [];

  $: roommateSlots = room ? Math.max(0, (room.room_capacity ?? 1) - 1) :
    existingBooking && !isCancelled ? Math.max(0, (existingBooking.room_capacity ?? 1) - 1) : 0;

  $: if (roommateSlots > 0 && roommateNames.length < roommateSlots) {
    roommateNames = [
      ...roommateNames,
      ...Array(roommateSlots - roommateNames.length).fill('')
    ];
  }
  $: datesValid = nights > 0 && checkIn && checkOut;

  $: nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  $: totalAmount = room ? parseFloat(room.price) * Math.max(nights, 1) : 0;
</script>

<div class="min-h-screen bg-stone-900 py-10 px-6">
  <div class="max-w-2xl mx-auto">

    <!-- Header -->
    <div class="mb-8">
      <a href="/profile/{participant.id}" class="text-sm text-amber-500 hover:underline">
        ← Back to registration
      </a>
      <h1 class="text-3xl font-bold text-stone-100 mt-2">Accommodation</h1>
      <p class="text-stone-400 text-sm mt-1">{event?.title}</p>
    </div>

    {#if success}
      <div class="mb-6 p-4 bg-green-900/30 border border-green-700 text-green-300 rounded-xl">
        ✅ Payment successful! Your room booking has been confirmed.
      </div>
    {/if}

    {#if paymentAbandoned}
      <div class="mb-6 p-4 bg-amber-900/30 border border-amber-700 text-amber-300 rounded-xl">
        Payment not completed — your room selection has been released.
      </div>
    {/if}

    {#if form?.message}
      <div class="mb-6 p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-xl text-sm">
        {form.message}
      </div>
    {/if}



    <!-- ── Cancelled booking notice ────────────────────────────────────────── -->
    {#if existingBooking && isCancelled}
      <div class="bg-stone-800/60 rounded-2xl border border-stone-700/50 p-5 mb-6">
        <div class="flex items-start gap-3">
          <span class="text-lg mt-0.5">🚫</span>
          <div>
            <p class="text-stone-400 text-sm font-semibold">Previous booking cancelled</p>
            <p class="text-stone-500 text-sm">{existingBooking.room_name}</p>
            <p class="text-stone-600 text-xs mt-0.5">
              Cancelled on {new Date(existingBooking.cancelled_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            {#if existingBooking.deposit_paid}
              <p class="text-stone-600 text-xs mt-1">Deposit was paid — contact the organiser for refund enquiries.</p>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- ── Active booking ─────────────────────────────────────────────────── -->
    {#if existingBooking && !isCancelled}
      <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 mb-6">
        <h2 class="text-lg font-semibold text-stone-100 mb-4">Your Room Booking</h2>

        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-stone-400">Room</span>
            <span class="text-stone-100 font-medium">{existingBooking.room_name}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-stone-400">Total price</span>
            <span class="text-stone-100">{parseFloat(existingBooking.total_amount).toFixed(2)} {existingBooking.currency}</span>
          </div>
          {#if existingBooking.check_in && existingBooking.check_out}
            <div class="flex justify-between text-sm">
              <span class="text-stone-400">Dates</span>
              <span class="text-stone-100">
                {new Date(existingBooking.check_in).toLocaleDateString()} →
                {new Date(existingBooking.check_out).toLocaleDateString()}
                ({existingBooking.nights} night{existingBooking.nights === 1 ? '' : 's'})
              </span>
            </div>
          {/if}
          {#if existingBooking.hotel_membership_id}
            <div class="flex justify-between text-sm">
              <span class="text-stone-400">Membership ID</span>
              <span class="text-stone-100 font-mono">{existingBooking.hotel_membership_id}</span>
            </div>
          {/if}
          <div class="flex justify-between text-sm">
            <span class="text-stone-400">Deposit ({depositPercent}%)</span>
            <div class="flex items-center gap-2">
              <span class="text-stone-100">{parseFloat(existingBooking.deposit_amount).toFixed(2)} {existingBooking.currency}</span>
              {#if existingBooking.deposit_paid}
                <span class="px-2 py-0.5 rounded-full text-xs bg-green-900 text-green-300">Paid</span>
              {:else}
                <span class="px-2 py-0.5 rounded-full text-xs bg-yellow-900 text-yellow-300">Pending</span>
              {/if}
            </div>
          </div>

          {#if existingBooking.remaining_amount > 0}
            <div class="flex justify-between text-sm">
              <span class="text-stone-400">Remaining balance</span>
              <div class="flex items-center gap-2">
                <span class="text-stone-100">{parseFloat(existingBooking.remaining_amount).toFixed(2)} {existingBooking.currency}</span>
                {#if existingBooking.remaining_paid}
                  <span class="px-2 py-0.5 rounded-full text-xs bg-green-900 text-green-300">Paid</span>
                {:else}
                  <span class="px-2 py-0.5 rounded-full text-xs bg-yellow-900 text-yellow-300">Outstanding</span>
                {/if}
              </div>
            </div>
          {/if}

          {#if finalDeadline && !existingBooking.remaining_paid && existingBooking.remaining_amount > 0}
            <div class="p-3 rounded-xl {isDeadlinePassed ? 'bg-red-900/30 border border-red-700' : 'bg-stone-700/50 border border-stone-600'} text-sm">
              {#if isDeadlinePassed}
                <p class="text-red-300">⚠️ Final payment deadline has passed ({finalDeadline}). Please contact the organiser.</p>
              {:else}
                <p class="text-stone-300">Final payment due by <strong class="text-amber-400">{finalDeadline}</strong></p>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Pay deposit or full amount -->
        {#if !existingBooking.deposit_paid}
          {#if PUBLIC_PAYMENTS_ENABLED === 'true'}
          <div class="mt-5 grid grid-cols-2 gap-3">

            <!-- Deposit -->
            <form method="POST" action="?/payDeposit" use:enhance>
              <div class="bg-stone-900 rounded-xl p-3 space-y-1 mb-3 text-xs text-stone-400">
                <p class="text-stone-300 font-semibold text-sm mb-1">Deposit ({depositPercent}%)</p>
                <div class="flex justify-between">
                  <span>Deposit</span>
                  <span>{parseFloat(existingBooking.deposit_amount).toFixed(2)} {existingBooking.currency}</span>
                </div>
                {#if feeModel === 'on_top'}
                  <div class="flex justify-between">
                    <span>Handling (3.5%)</span>
                    <span>{(parseFloat(existingBooking.deposit_amount) * 0.035).toFixed(2)} {existingBooking.currency}</span>
                  </div>
                {/if}
                <div class="flex justify-between">
                  <span>Service fee ({event?.platform_fee_percent ?? 1}%)</span>
                  <span>{(parseFloat(existingBooking.deposit_amount) * ((event?.platform_fee_percent ?? 1) / 100)).toFixed(2)} {existingBooking.currency}</span>
                </div>
                <div class="flex justify-between border-t border-stone-700 pt-1 font-semibold text-stone-200">
                  <span>Due now</span>
                  <span class="text-amber-400">
                    {(parseFloat(existingBooking.deposit_amount) * (feeModel === 'on_top' ? 1.035 : 1) * (1 + (event?.platform_fee_percent ?? 1) / 100)).toFixed(2)} {existingBooking.currency}
                  </span>
                </div>
                {#if finalDeadline}
                  <p class="text-stone-600 pt-0.5">Rest due {finalDeadline}</p>
                {/if}
              </div>
              <button type="submit" class="w-full py-2.5 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-xl transition text-sm">
                Pay deposit
              </button>
            </form>

            <!-- Full payment -->
            <form method="POST" action="?/payFull" use:enhance>
              <div class="bg-stone-900 rounded-xl p-3 space-y-1 mb-3 text-xs text-stone-400">
                <p class="text-stone-300 font-semibold text-sm mb-1">Pay in full</p>
                <div class="flex justify-between">
                  <span>Total</span>
                  <span>{fullAmount.toFixed(2)} {existingBooking.currency}</span>
                </div>
                {#if feeModel === 'on_top'}
                  <div class="flex justify-between">
                    <span>Handling (3.5%)</span>
                    <span>{fullHandlingFee.toFixed(2)} {existingBooking.currency}</span>
                  </div>
                {/if}
                <div class="flex justify-between">
                  <span>Service fee ({event?.platform_fee_percent ?? 1}%)</span>
                  <span>{fullServiceFee.toFixed(2)} {existingBooking.currency}</span>
                </div>
                <div class="flex justify-between border-t border-stone-700 pt-1 font-semibold text-stone-200">
                  <span>Due now</span>
                  <span class="text-amber-400">{fullGrandTotal.toFixed(2)} {existingBooking.currency}</span>
                </div>
                <p class="text-stone-600 pt-0.5">No further payments</p>
              </div>
              <button type="submit" class="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition text-sm">
                Pay in full
              </button>
            </form>

          </div>
          {:else}
            <p class="mt-4 text-xs text-stone-500 text-center">Online payment is not yet available — we'll notify you when it opens.</p>
          {/if}
        {/if}

        <!-- Pay remaining -->
        {#if PUBLIC_PAYMENTS_ENABLED === 'true' && existingBooking.deposit_paid && !existingBooking.remaining_paid && existingBooking.remaining_amount > 0 && !isDeadlinePassed}
          <form method="POST" action="?/payRemaining" use:enhance class="mt-5">
            <div class="bg-stone-900 rounded-xl p-4 space-y-1 mb-4 text-xs text-stone-400">
              <div class="flex justify-between">
                <span>Remaining balance</span>
                <span>{rem.toFixed(2)} {existingBooking.currency}</span>
              </div>
              {#if feeModel === 'on_top'}
                <div class="flex justify-between">
                  <span>Payment handling (3.5%)</span>
                  <span>{remHandlingFee.toFixed(2)} {existingBooking.currency}</span>
                </div>
              {/if}
              <div class="flex justify-between">
                <span>Service fee ({event?.platform_fee_percent ?? 1}%)</span>
                <span>{remServiceFee.toFixed(2)} {existingBooking.currency}</span>
              </div>
              <div class="flex justify-between border-t border-stone-700 pt-1 font-semibold text-stone-200">
                <span>Total due</span>
                <span class="text-amber-400">{remGrandTotal.toFixed(2)} {existingBooking.currency}</span>
              </div>
            </div>
            <button type="submit"
              class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition">
              Pay remaining balance — {remGrandTotal.toFixed(2)} {existingBooking.currency}
            </button>
          </form>
        {/if}

        {#if existingBooking.deposit_paid && existingBooking.remaining_paid}
          <div class="mt-4 p-3 bg-green-900/20 border border-green-800 rounded-xl text-center text-green-300 text-sm">
            ✅ Room fully paid — you're all set!
          </div>
        {/if}

        <!-- Cancel booking -->
        <div class="mt-5 pt-4 border-t border-stone-700/50">
          {#if !showCancelConfirm}
            <button
              on:click={() => showCancelConfirm = true}
              class="w-full py-2.5 text-sm text-stone-500 hover:text-red-400 border border-stone-700 hover:border-red-800/60 rounded-xl transition">
              Cancel booking
            </button>
          {:else}
            <div class="p-4 bg-red-950/40 border border-red-800/60 rounded-xl">
              <p class="text-red-300 text-sm font-semibold mb-1">Cancel this booking?</p>
              <p class="text-stone-400 text-xs mb-4">
                Your booking will be marked as cancelled.{#if existingBooking.deposit_paid}
                  {' '}You have already paid — contact the organiser for refund enquiries.{/if}
              </p>
              <div class="flex gap-3">
                <form method="POST" action="?/cancelBooking" use:enhance class="flex-1">
                  <button type="submit"
                    class="w-full py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition">
                    Yes, cancel
                  </button>
                </form>
                <button
                  on:click={() => showCancelConfirm = false}
                  class="flex-1 py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 text-sm font-semibold rounded-lg transition">
                  Keep booking
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Roommate editor -->
      {#if roommateSlots > 0}
        <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6 mb-6">
          <h3 class="text-base font-semibold text-stone-100 mb-1">Roommates</h3>
          <p class="text-stone-500 text-xs mb-3">
            This room fits {existingBooking.room_capacity ?? 1} people — you can have {roommateSlots} roommate{roommateSlots === 1 ? '' : 's'}.
          </p>
          <form method="POST" action="?/updateRoommates" use:enhance={() => {
            return async ({ update }) => { await update({ reset: false }); };
          }} class="space-y-2">
            {#each Array(roommateSlots) as _, i}
              <input
                type="text"
                name="roommate_names"
                bind:value={roommateNames[i]}
                placeholder="Roommate {i + 1} name"
                class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
              />
            {/each}
            <button type="submit"
              class="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl transition mt-2">
              Save Roommates
            </button>
          </form>
        </div>
      {/if}
    {/if}

    <!-- ── Room selection (no active booking) ────────────────────────────── -->
    {#if !existingBooking || isCancelled}
      {#if rooms.length === 0}
        <div class="bg-stone-800 rounded-2xl border border-stone-700 p-8 text-center text-stone-500">
          No accommodation options available for this event yet.
        </div>
      {:else}
        <div class="bg-stone-800 rounded-2xl border border-stone-700 p-6">
          <h2 class="text-lg font-semibold text-stone-100 mb-5">Select a Room</h2>

          <form method="POST" action="?/book" use:enhance class="space-y-5">

            <div class="space-y-3">
              {#each rooms as r (r.id)}
                {@const available = r.quantity_total ? r.quantity_total - (r.quantity_sold ?? 0) : null}
                {@const soldOut = r.quantity_total && (r.quantity_sold ?? 0) >= r.quantity_total}
                <label class="block cursor-pointer {soldOut ? 'opacity-50 cursor-not-allowed' : ''}">
                  <input type="radio" name="product_id" value={r.id}
                    bind:group={selectedRoom}
                    disabled={soldOut}
                    class="sr-only peer" />
                  <div class="p-4 rounded-xl border-2 transition
                    {selectedRoom === r.id
                      ? 'border-amber-500 bg-stone-900'
                      : 'border-stone-700 bg-stone-900/50 hover:border-stone-500'}">
                    <div class="flex justify-between items-start">
                      <div>
                        <p class="font-semibold text-stone-100">{r.name}</p>
                        {#if r.description}
                          <p class="text-xs text-stone-400 mt-0.5">{r.description}</p>
                        {/if}
                        {#if available !== null}
                          <p class="text-xs text-stone-500 mt-1">
                            {soldOut ? 'Sold out' : `${available} remaining`}
                          </p>
                        {/if}
                      </div>
                      <span class="text-lg font-bold text-stone-100 ml-4">
                        {parseFloat(r.price).toFixed(2)} {r.currency_type}
                      </span>
                    </div>
                  </div>
                </label>
              {/each}
            </div>

            {#if selectedRoom}
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label for="accom-checkin" class="block text-sm font-medium text-stone-300 mb-1.5">Check-in</label>
                  <input id="accom-checkin" type="date" name="check_in" bind:value={checkIn} required
                    class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label for="accom-checkout" class="block text-sm font-medium text-stone-300 mb-1.5">Check-out</label>
                  <input id="accom-checkout" type="date" name="check_out" bind:value={checkOut} required
                    class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
                </div>
              </div>

              {#if datesValid}
                <p class="text-xs text-stone-400 -mt-2">
                  {nights} night{nights === 1 ? '' : 's'} ·
                  {parseFloat(room.price).toFixed(2)} {room.currency_type} per night ·
                  <span class="text-stone-200 font-semibold">{totalAmount.toFixed(2)} {room.currency_type} total</span>
                </p>

                {#if roommateSlots > 0}
                  <div class="space-y-2">
                    <p class="block text-sm font-medium text-stone-300">
                      Roommates <span class="text-stone-500 font-normal">(optional)</span>
                    </p>
                    {#each Array(roommateSlots) as _, i}
                      <input
                        type="text"
                        name="roommate_names"
                        bind:value={roommateNames[i]}
                        placeholder="Roommate {i + 1} name"
                        class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                    {/each}
                  </div>
                {/if}

                <div>
                  <label for="accom-membership" class="block text-sm font-medium text-stone-300 mb-1.5">
                    Hotel Membership ID <span class="text-stone-500 font-normal">(optional)</span>
                  </label>
                  <input id="accom-membership" type="text" name="hotel_membership_id" bind:value={hotelMembershipId}
                    placeholder="e.g. Scandic Friends, Nordic Choice Club..."
                    class="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:border-amber-500" />
                  <p class="text-xs text-stone-500 mt-1">Enter your hotel loyalty membership number if you have one</p>
                </div>

                <div>
                  <p class="text-sm font-medium text-stone-300 mb-3">Payment option</p>
                  <div class="grid grid-cols-2 gap-3">
                    <label class="cursor-pointer">
                      <input type="radio" name="payment_type" value="deposit" bind:group={paymentType} class="sr-only" />
                      <div class="p-3 rounded-xl border-2 text-center transition
                        {paymentType === 'deposit' ? 'border-amber-500 bg-stone-900' : 'border-stone-700 bg-stone-900/50 hover:border-stone-500'}">
                        <p class="font-semibold text-stone-100 text-sm">Reserve with deposit</p>
                        <p class="text-amber-400 font-bold mt-1">{depositAmount.toFixed(2)} {currency}</p>
                        <p class="text-xs text-stone-500 mt-0.5">{depositPercent}% now</p>
                        {#if finalDeadline}
                          <p class="text-xs text-stone-500">Rest due {finalDeadline}</p>
                        {/if}
                      </div>
                    </label>
                    <label class="cursor-pointer">
                      <input type="radio" name="payment_type" value="full" bind:group={paymentType} class="sr-only" />
                      <div class="p-3 rounded-xl border-2 text-center transition
                        {paymentType === 'full' ? 'border-amber-500 bg-stone-900' : 'border-stone-700 bg-stone-900/50 hover:border-stone-500'}">
                        <p class="font-semibold text-stone-100 text-sm">Pay in full</p>
                        <p class="text-amber-400 font-bold mt-1">{totalAmount.toFixed(2)} {currency}</p>
                        <p class="text-xs text-stone-500 mt-0.5">No further payments</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div class="bg-stone-900 rounded-xl p-4 space-y-1.5 text-xs text-stone-400">
                  <div class="flex justify-between">
                    <span>{paymentType === 'full' ? 'Full payment' : `Deposit (${depositPercent}%)`}</span>
                    <span>{chargeAmount.toFixed(2)} {currency}</span>
                  </div>
                  {#if feeModel === 'on_top'}
                    <div class="flex justify-between">
                      <span>Payment handling (3.5%)</span>
                      <span>{handlingFee.toFixed(2)} {currency}</span>
                    </div>
                  {/if}
                  <div class="flex justify-between">
                    <span>Service fee ({event?.platform_fee_percent ?? 1}%)</span>
                    <span>{serviceFee.toFixed(2)} {currency}</span>
                  </div>
                  {#if paymentType === 'deposit'}
                    <div class="flex justify-between text-stone-500 pt-1 border-t border-stone-800">
                      <span>Remaining balance (due later)</span>
                      <span>{remainingAmount.toFixed(2)} {currency}</span>
                    </div>
                  {/if}
                  <div class="flex justify-between border-t border-stone-700 pt-1.5 font-semibold text-stone-200 text-sm">
                    <span>Due now</span>
                    <span class="text-amber-400">{grandTotal.toFixed(2)} {currency}</span>
                  </div>
                </div>

                <button type="submit"
                  class="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition">
                  Book now — {grandTotal.toFixed(2)} {currency}
                </button>

              {:else}
                <p class="text-xs text-stone-500 text-center py-2">Select check-in and check-out dates to continue</p>
              {/if}
            {/if}
          </form>
        </div>
      {/if}
    {/if}

        <!-- ── Booking policy ────────────────────────────────────────────────── -->
    <div class="bg-stone-800/60 rounded-2xl border border-stone-700 p-5 space-y-3">
      <div class="flex items-center gap-2">
        <span class="text-base">📋</span>
        <h3 class="text-sm font-semibold text-stone-200">Booking policy</h3>
      </div>
      <ul class="space-y-2 text-sm text-stone-400">
        <li class="flex gap-2">
          <span class="text-stone-500 mt-0.5 shrink-0">•</span>
          <span>The prices listed are the rates we have negotiated directly with the hotel on your behalf.</span>
        </li>
        <li class="flex gap-2">
          <span class="text-stone-500 mt-0.5 shrink-0">•</span>
          <span>Your room is <strong class="text-stone-300">not guaranteed</strong> until a deposit or full payment has been completed.</span>
        </li>
        <li class="flex gap-2">
          <span class="text-amber-600 mt-0.5 shrink-0">•</span>
          <span><strong class="text-stone-300">The deposit is non-refundable</strong> regardless of cancellation.</span>
        </li>
        <li class="flex gap-2">
          <span class="text-stone-500 mt-0.5 shrink-0">•</span>
          <span>You may cancel your room booking free of charge (excluding the deposit) up until <strong class="text-stone-300">28 June</strong>. Cancellations after this date may incur the full room cost.</span>
        </li>
        <li class="flex gap-2">
          <span class="text-stone-500 mt-0.5 shrink-0">•</span>
          <span>After 28 June, room availability through DancePoint is no longer guaranteed. You will need to contact the hotel directly to arrange accommodation.</span>
        </li>
      </ul>
    </div>

  </div>
</div>


