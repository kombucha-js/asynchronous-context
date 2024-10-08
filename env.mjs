
import { ENV_SETTINGS, readSettings } from './settings.mjs';

let __DONE__dotenvFromSettings = false;

export const env = (settings)=>{
  if ( __DONE__dotenvFromSettings ) {
    return;
  }
  __DONE__dotenvFromSettings = true;

  console.log( 'asynchronous-context/env is activated' );
  const inenv = settings?.env ?? null;
  const outenv = process.env;

  if ( inenv === null ) {
    throw new Error( `.env entry was not found in ${settings.filenameOfSettings}` );
  }

  Object.entries(inenv).map(([k,v])=>{
    if ( typeof k === 'string' || typeof k === 'number' ) {
      if ( k === ENV_SETTINGS ) {
      } else {
        outenv[k] = v;
      }
    } else {
      console.warn( `asynchronous-context.env : WANING '${k}' is not a valid key for 'process.env'. ignored.` );
    }
  });
};

export const dotenvFromSettings = ()=>{
  env( readSettings() );
};


export const config = dotenvFromSettings;
