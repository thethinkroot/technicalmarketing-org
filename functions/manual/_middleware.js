// functions/manual/_middleware.js
//
// HTTP Basic Auth gate for /manual/*.
// Runs as a Cloudflare Pages Function before any static file in this path tree.
// Free tier. Unlimited users. One shared credential.
//
// Credentials are stored in Cloudflare Pages environment variables.
// Required variables (set in Pages dashboard → Settings → Environment variables):
//   MANUAL_USER — the username
//   MANUAL_PASS — the password

const REALM = 'Technical Marketing Manual';

export const onRequest = async ({ request, env, next }) => {
  const expectedUser = env.MANUAL_USER;
  const expectedPass = env.MANUAL_PASS;

  if (!expectedUser || !expectedPass) {
    return new Response(
      'Manual gate not configured. Set MANUAL_USER and MANUAL_PASS in the Cloudflare Pages dashboard.',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  const auth = request.headers.get('Authorization');
  if (!auth) return unauthorized();

  const [scheme, encoded] = auth.split(' ');
  if (scheme !== 'Basic' || !encoded) return unauthorized();

  let decoded;
  try {
    decoded = atob(encoded);
  } catch {
    return unauthorized();
  }

  // Split on the first colon only — passwords may contain colons.
  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) return unauthorized();

  const user = decoded.slice(0, colonIndex);
  const pass = decoded.slice(colonIndex + 1);

  if (user !== expectedUser || pass !== expectedPass) {
    return unauthorized();
  }

  // Authenticated. Continue to the static file.
  return next();
};

function unauthorized() {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
