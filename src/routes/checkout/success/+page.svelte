<script lang="ts">
    // Route for /api/stripe/checkout/success showing a simple success message after returning from Stripe checkout
  import { page } from '$app/stores';
</script>

<div class="text-center py-16">
  <h1 class="text-3xl font-bold text-green-600">Payment successful! 🎉</h1>
  <p class="mt-2 text-gray-600">Your tickets have been confirmed.</p>
  <a href="/profile" class="mt-6 inline-block text-indigo-600 underline">Back to Profile</a>
</div>