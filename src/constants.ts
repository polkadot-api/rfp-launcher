export const BLOCK_LENGTH = 6;
export const KRAKEN_SYMBOL_PAIR = "KSMUSD";
export const TOKEN_SYMBOL = "KSM";
export const TOKEN_DECIMALS = 12;
export const REFERENDUM_PRICE_BUFFER = 0.25;
export const CHOPSTICKS_URL = `http://localhost:8133`;

// Light client disabled while https://github.com/paritytech/litep2p/pull/393, which can cause transactions through smoldot to not get included in blocks.
export const FEATURE_LIGHT_CLIENT = false;
