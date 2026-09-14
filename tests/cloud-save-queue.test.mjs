import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSaveQueue } from '../cloud-save-queue.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('new progress during an upload is sent after that upload finishes',async()=>{
  let value=1,release;const writes=[];
  const queue=createCloudSaveQueue({run:async()=>{writes.push(value);if(writes.length===1)await new Promise(resolve=>release=resolve);}});
  const pending=queue.flush();await tick();value=2;queue.request();value=3;queue.request();release();await pending;
  assert.deepEqual(writes,[1,3]);queue.stop();
});
test('rapid requests coalesce and never run concurrent uploads',async()=>{
  let running=0,maximum=0,calls=0;
  const queue=createCloudSaveQueue({delayMs:0,run:async()=>{running++;maximum=Math.max(maximum,running);calls++;await tick();running--;}});
  queue.request();queue.request();queue.request();await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(calls,1);assert.equal(maximum,1);queue.stop();
});
test('a failed upload can be explicitly retried with current data',async()=>{
  let fail=true,value=1;const writes=[];
  const queue=createCloudSaveQueue({run:()=>{if(fail)throw Error('offline');writes.push(value);}});
  await assert.rejects(queue.flush(),/offline/);fail=false;value=2;await queue.flush();assert.deepEqual(writes,[2]);queue.stop();
});
test('stopping a profile queue prevents pending work after its in-flight upload',async()=>{
  let release,calls=0;
  const queue=createCloudSaveQueue({run:async()=>{calls++;await new Promise(resolve=>release=resolve);}});
  const pending=queue.flush();await tick();queue.request();queue.stop();release();await pending;await queue.flush();assert.equal(calls,1);
});
