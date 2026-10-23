import { arcadeMessage, decode58, encode58 } from './arcade-transaction.mjs';

const fail = code => Object.assign(new Error(code), { code });
const toBase64 = bytes => btoa(String.fromCharCode(...bytes));
function fromBase64(value, length) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw fail('invalid_wallet_response');
  const bytes = Uint8Array.from(atob(value), char => char.charCodeAt(0));
  if (bytes.length !== length || toBase64(bytes) !== value) throw fail('invalid_wallet_response');
  return bytes;
}

export function supportsMobileWallet(userAgent, secureContext = true) {
  return secureContext && /Android/i.test(userAgent || '') && /Chrome\//.test(userAgent || '')
    && !/EdgA|OPR\/|Firefox|SamsungBrowser|DuckDuckGo|Brave/i.test(userAgent || '');
}

function walletError(error) {
  // Only explicit refusals are safe to classify as rejected. A dropped session
  // or timeout may follow submission and must retain the pending payment.
  if ([4001, -1, -3, 'USER_REJECTED', 'ERROR_ASSOCIATION_CANCELLED'].includes(error?.code)) return fail('USER_REJECTED');
  if (['ERROR_WALLET_NOT_FOUND', 'ERROR_BROWSER_NOT_SUPPORTED'].includes(error?.code)) return fail('missing_wallet');
  return error;
}

/** No wallet is contacted until connect() or withPaymentSession() is called by a user gesture. */
export function createWebWallet({
  nativeProvider = () => null, phantomProvider = () => null, legacyProvider = () => null,
  mobileSupported = false, transact, origin = 'https://mezzopollo.it', icon, onChange = () => {},
  localNetwork = null,
}) {
  let publicKey = null, authToken = null, generation = 0, busy = false;
  const listeners = new Map(), watched = new WeakSet();
  const identity = Object.freeze({ name: 'MezzoPollo', uri: origin, ...(icon ? { icon } : {}) });
  function emit(event, value) {
    for (const listener of listeners.get(event) || []) { try { listener(value); } catch { /* UI listeners do not own the wallet session. */ } }
    onChange();
  }
  function on(event, listener) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(listener);
  }
  function off(event, listener) { listeners.get(event)?.delete(listener); }
  function setAccount(next) {
    const previous = publicKey;
    publicKey = next;
    if (!previous) emit('connect', next);
    else if (previous !== next) emit('accountChanged', next);
    else onChange();
  }
  function clearAccount() {
    publicKey = null; authToken = null; generation++;
    emit('disconnect');
  }
  function watch(provider) {
    if (!provider || watched.has(provider)) return provider;
    watched.add(provider);
    for (const event of ['connect', 'accountChanged', 'disconnect']) provider.on?.(event, onChange);
    return provider;
  }
  function getProvider() {
    const native = nativeProvider();
    if (native?.isMezzoMobile === true && typeof native.connect === 'function') return watch(native);
    const phantom = phantomProvider();
    if (phantom?.isPhantom === true && typeof phantom.connect === 'function') return watch(phantom);
    const legacy = legacyProvider();
    if (legacy?.isPhantom === true && typeof legacy.connect === 'function') return watch(legacy);
    return mobileSupported && typeof transact === 'function' ? mobile : null;
  }
  function withMobileSession(operation) {
    if (busy) return Promise.reject(fail('payment_busy'));
    // Chrome asks before a website may reach another app on this phone (Local Network Access):
    // the wallet listens on localhost. Asked while the wallet is already opening, the question
    // stays behind it and ends as a denial. So it is raised while the game is on screen, and the
    // wallet opens on the next click, once allowed (an app needs a fresh user activation anyway).
    const network = localNetwork?.state?.();
    if (network === 'prompt') {
      localNetwork.request?.();
      return Promise.reject(fail('local_network_prompt'));
    }
    if (network === 'denied') return Promise.reject(fail('local_network_blocked'));
    busy = true;
    const epoch = generation;
    let task;
    try {
      // Invoke the official transport synchronously: Chrome must receive the
      // Android intent while the initiating click still has user activation.
      task = transact(async wallet => {
        const authorization = await wallet.authorize({ chain: 'solana:mainnet', identity, ...(authToken ? { auth_token: authToken } : {}) });
        if (epoch !== generation) throw fail('wallet_disconnected');
        const accounts = authorization?.accounts;
        if (!Array.isArray(accounts) || !accounts.length || typeof authorization.auth_token !== 'string' || !authorization.auth_token) throw fail('invalid_wallet_response');
        const account = accounts[0];
        if (account.chains && !account.chains.includes('solana:mainnet')) throw fail('invalid_wallet_response');
        const accountKey = encode58(fromBase64(account.address, 32));
        decode58(accountKey);
        authToken = authorization.auth_token;
        setAccount(accountKey);
        let active = true, signing = false, attempted = false;
        function assertActive() {
          if (!active || epoch !== generation || publicKey !== accountKey) throw fail('wallet_disconnected');
        }
        const session = Object.freeze({
          isMezzoWebWallet: true,
          get publicKey() { return accountKey; },
          get isConnected() { return active && epoch === generation && publicKey === accountKey; },
          connect() { assertActive(); return Promise.resolve({ publicKey: accountKey }); },
          disconnect: mobile.disconnect, on, off, removeListener: off,
          async payArcade(prepared) {
            assertActive();
            if (signing || attempted) throw fail('payment_busy');
            if (prepared?.payer !== accountKey) throw fail('payer_mismatch');
            const message = arcadeMessage(prepared);
            // One unsigned signature slot followed by the locally reviewed
            // legacy message. Never sign transaction bytes from the server.
            const transaction = new Uint8Array(65 + message.length);
            transaction[0] = 1; transaction.set(message, 65);
            signing = true; attempted = true;
            try {
              const result = await wallet.signAndSendTransactions({ payloads: [toBase64(transaction)], options: { commitment: 'confirmed' } });
              if (!Array.isArray(result?.signatures) || result.signatures.length !== 1) throw fail('invalid_wallet_response');
              const signature = encode58(fromBase64(result.signatures[0], 64));
              decode58(signature, 64);
              return { signature };
            } catch (error) { throw walletError(error); }
            finally { signing = false; }
          },
        });
        try { return await operation(session); }
        finally { active = false; }
      });
    } catch (error) { task = Promise.reject(error); }
    return Promise.resolve(task).catch(error => {
      if (error?.code === -1) clearAccount();
      throw walletError(error);
    }).finally(() => { busy = false; });
  }
  const mobile = Object.freeze({
    isMezzoWebWallet: true,
    get publicKey() { return publicKey; },
    get isConnected() { return publicKey !== null; },
    connect: () => withMobileSession(session => session.connect()),
    // Forget authorization locally. A later explicit action must authorize
    // again; disconnect never opens the wallet or signs anything.
    disconnect() { clearAccount(); return Promise.resolve(); },
    payArcade: prepared => withMobileSession(session => session.payArcade(prepared)),
    on, off, removeListener: off,
  });
  return Object.freeze({
    getProvider,
    connect() {
      const provider = getProvider();
      if (!provider) return Promise.reject(fail('missing_wallet'));
      return provider.connect();
    },
    withPaymentSession(operation) {
      const provider = getProvider();
      if (!provider) return Promise.reject(fail('missing_wallet'));
      return provider === mobile ? withMobileSession(operation) : operation(provider);
    },
  });
}
