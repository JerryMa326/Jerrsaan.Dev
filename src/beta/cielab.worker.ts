import { labStats } from './science'
self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try { self.postMessage({result:labStats(new Uint8ClampedArray(event.data))}) }
  catch(error){self.postMessage({error:error instanceof Error?error.message:'Measurement failed'})}
}
