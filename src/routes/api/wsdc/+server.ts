import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const num = url.searchParams.get('num');

  const response = await fetch(`https://points.worldsdc.com/lookup/find?num=${num}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  const text = await response.text();
  return new Response(text, {
    headers: { 'Content-Type': 'text/html' },
  });
};