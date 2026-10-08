const aborted = () => new DOMException('A próba megállt.', 'AbortError');
export const stopRStream = stream => stream?.getTracks().forEach(track=>track.stop());

// Late permission results are closed after cancellation or the startup timeout.
export function openRStream(signal, request = () => navigator.mediaDevices.getUserMedia({audio:true}), startupMs = 12000) {
  if(signal?.aborted)return Promise.reject(aborted());
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(error,stream)=>{
      if(settled){stopRStream(stream);return;}
      settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);
      if(error){stopRStream(stream);reject(error);}else resolve(stream);
    };
    const cancel=()=>finish(aborted());
    const timer=setTimeout(()=>finish(Error('A mikrofon engedélyezése még nem fejeződött be. Próbáld újra, vagy válaszd a közös módot!')),startupMs);
    signal?.addEventListener('abort',cancel,{once:true});
    Promise.resolve().then(request).then(stream=>finish(signal?.aborted?aborted():null,stream),error=>finish(error));
  });
}

export async function detectRVoiceActivity({signal,onStart,durationMs=6500}={}) {
  let stream,context;
  try {
    if(!navigator.mediaDevices?.getUserMedia)throw Error('A mikrofon ebben a böngészőben nem használható. Válaszd a közös módot!');
    stream=await openRStream(signal);
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)throw Error('A hangészlelés itt nem érhető el. Válaszd a közös módot!');
    context=new Context();await context.resume();
    if(signal?.aborted)throw aborted();
    const analyser=context.createAnalyser();analyser.fftSize=1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const data=new Uint8Array(analyser.fftSize), start=performance.now();let activeMs=0;
    onStart?.();
    while(performance.now()-start<durationMs) {
      if(signal?.aborted)throw aborted();
      analyser.getByteTimeDomainData(data);
      const rms=Math.sqrt(data.reduce((sum,value)=>sum+(value-128)**2,0)/data.length);
      activeMs=rms>8?activeMs+30:0;
      if(activeMs>=450)return {detected:true};
      await new Promise(resolve=>setTimeout(resolve,30));
    }
    return {detected:false};
  } finally {stopRStream(stream);if(context)await context.close().catch(()=>{});}
}

export function createRRecorder({Recorder=globalThis.MediaRecorder, getMedia=()=>navigator.mediaDevices.getUserMedia({audio:true}), supported=()=>Boolean(globalThis.navigator?.mediaDevices?.getUserMedia), now=()=>performance.now(), maxBytes=2*1024*1024}={}) {
  let operation=null;
  const isSupported=()=>typeof Recorder==='function'&&supported();
  function record({signal,onStart,onTick,maxMs=8000}={}) {
    if(!isSupported())return Promise.resolve({error:'unsupported'});
    if(operation)return Promise.resolve({error:'busy'});
    if(signal?.aborted)return Promise.resolve({error:'aborted'});
    return new Promise(resolve=>{
      const op={done:false,recorder:null,stream:null,chunks:[],bytes:0,startedAt:null,closed:false};operation=op;
      const closeStream=()=>{if(!op.closed&&op.stream){op.closed=true;stopRStream(op.stream);}};
      const finish=(error='')=>{
        if(op.done)return;op.done=true;
        clearTimeout(op.timer);clearTimeout(op.startup);clearInterval(op.tick);
        signal?.removeEventListener('abort',cancel);
        const duration=op.startedAt===null?0:Math.min(maxMs,now()-op.startedAt);
        const recorder=op.recorder;
        if(recorder){recorder.onstart=recorder.ondataavailable=recorder.onstop=recorder.onerror=null;if(recorder.state!=='inactive')try{recorder.stop();}catch{}}
        closeStream();if(operation===op)operation=null;
        if(error){resolve({error});return;}
        const blob=new Blob(op.chunks,{type:recorder?.mimeType||op.chunks[0]?.type||'audio/webm'});
        if(blob.size<100||duration<250)resolve({error:'too-short'});
        else resolve({blob,duration});
      };
      const cancel=()=>finish('aborted');op.cancel=cancel;
      op.finish=()=>{if(!op.recorder||op.recorder.state==='inactive'){cancel();return;}clearTimeout(op.timer);clearInterval(op.tick);try{op.recorder.stop();closeStream();}catch{finish('recording-error');}};
      signal?.addEventListener('abort',cancel,{once:true});
      op.startup=setTimeout(()=>finish('start-timeout'),16000);
      (async()=>{
        try {
          op.stream=await openRStream(signal,getMedia);
          if(op.done||signal?.aborted){closeStream();return;}
          const type=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(value=>Recorder.isTypeSupported?.(value));
          const recorder=new Recorder(op.stream,type?{mimeType:type}:{});op.recorder=recorder;
          recorder.onstart=()=>{
            if(op.done)return;clearTimeout(op.startup);op.startedAt=now();onStart?.();
            if(op.done)return;
            op.timer=setTimeout(op.finish,maxMs);
            op.tick=setInterval(()=>{if(!op.done)onTick?.(Math.min(maxMs,now()-op.startedAt));},250);
          };
          recorder.ondataavailable=event=>{
            if(op.done||!event.data?.size)return;
            op.bytes+=event.data.size;
            if(op.bytes>maxBytes){finish('too-large');return;}
            op.chunks.push(event.data);
          };
          recorder.onstop=()=>finish();recorder.onerror=()=>finish('recording-error');
          recorder.start(250);
        } catch(error) {finish(signal?.aborted?'aborted':error?.name==='NotAllowedError'?'not-allowed':'recording-error');}
      })();
    });
  }
  return {record,isSupported,finish(){operation?.finish();},cancel(){operation?.cancel();}};
}
