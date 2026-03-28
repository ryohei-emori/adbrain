/**
 * Post Login — step-up MFA when the authorization request signals MFA via acr_values.
 *
 * - If acr_values indicates MFA and the user already completed an MFA method, set `acr` on tokens.
 * - Otherwise challenge MFA (OTP / Guardian) before completing login.
 */
exports.onExecutePostLogin = async (event, api) => {
  const query = event.request && event.request.query ? event.request.query : {};
  const acrRaw = query.acr_values || '';
  const acrValues =
    typeof acrRaw === 'string' ? acrRaw.trim().split(/\s+/).filter(Boolean) : [];

  const mfaRequested = acrValues.some((v) => {
    const lower = v.toLowerCase();
    return (
      lower.includes('mfa') ||
      lower.includes('otp') ||
      lower.includes('auth0.com/mfa') ||
      lower.includes('incommon:iap:silver') ||
      lower === 'urn:mace:incommon:iap:silver'
    );
  });

  if (!mfaRequested) {
    return;
  }

  const methods = (event.authentication && event.authentication.methods) || [];
  const mfaCompleted = methods.some((m) => {
    const t = String(m.type || m.name || '').toLowerCase();
    return (
      t === 'mfa' ||
      t === 'totp' ||
      t === 'otp' ||
      t.includes('guardian') ||
      t.includes('phone') ||
      t.includes('email')
    );
  });

  const acrClaim = 'http://auth0.com/loa/2';

  if (mfaCompleted) {
    api.idToken.setCustomClaim('acr', acrClaim);
    api.accessToken.setCustomClaim('acr', acrClaim);
    return;
  }

  // Challenge second factor (OTP / Guardian, depending on tenant configuration)
  api.multifactor.enable('any', { ignoreCookie: true });
};
