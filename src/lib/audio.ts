/**
 * Live API audio contract:
 *   input  - raw 16-bit PCM, 16 kHz, mono, little-endian
 *   output - raw 16-bit PCM, 24 kHz, mono, little-endian
 */
export const MIC_SAMPLE_RATE = 16000;
export const PLAYBACK_SAMPLE_RATE = 24000;

const MIC_WORKLET_NAME = "mic-capture-processor";

const MIC_WORKLET_SOURCE = `
class MicCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) {
      this.port.postMessage(channel.slice(0));
    }
    return true;
  }
}
registerProcessor('${MIC_WORKLET_NAME}', MicCaptureProcessor);
`;

export const encodePcm16 = (samples: Float32Array): string => {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const decodePcm16 = (base64: string): Float32Array<ArrayBuffer> => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(new ArrayBuffer(Math.floor(bytes.length / 2) * 4));
  for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 0x8000;
  return samples;
};

export const blobToBase64 = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const RECORDER_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

/** Whatever this browser will actually record. Chrome gives webm, Safari mp4. */
export const pickRecorderMimeType = (): string | undefined =>
  RECORDER_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));

const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
};

/** 16-bit mono PCM wrapped in a WAV header. */
export const encodeWav = (samples: Float32Array, sampleRate: number): Blob => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }

  return new Blob([buffer], { type: "audio/wav" });
};

/**
 * Browsers disagree on what MediaRecorder produces, so every clip is normalised
 * to 16 kHz mono WAV before it goes to Gemini.
 */
export const toWavBlob = async (recording: Blob, sampleRate = MIC_SAMPLE_RATE): Promise<Blob> => {
  const arrayBuffer = await recording.arrayBuffer();

  const decodeContext = new AudioContext();
  const decoded = await decodeContext.decodeAudioData(arrayBuffer);
  await decodeContext.close();

  const frameCount = Math.max(1, Math.ceil(decoded.duration * sampleRate));
  const offline = new OfflineAudioContext(1, frameCount, sampleRate);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();

  const rendered = await offline.startRendering();
  return encodeWav(rendered.getChannelData(0), sampleRate);
};

export interface MicStream {
  stop: () => Promise<void>;
}

export const startMicStream = async (onChunk: (base64: string) => void): Promise<MicStream> => {
  const mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const context = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
  const moduleUrl = URL.createObjectURL(
    new Blob([MIC_WORKLET_SOURCE], { type: "application/javascript" })
  );

  try {
    await context.audioWorklet.addModule(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }

  const source = context.createMediaStreamSource(mediaStream);
  const capture = new AudioWorkletNode(context, MIC_WORKLET_NAME);
  capture.port.onmessage = (event: MessageEvent<Float32Array>) => onChunk(encodePcm16(event.data));

  // The worklet writes nothing to its output, so this connection stays silent.
  source.connect(capture);
  capture.connect(context.destination);

  return {
    stop: async () => {
      capture.port.onmessage = null;
      capture.disconnect();
      source.disconnect();
      mediaStream.getTracks().forEach((track) => track.stop());
      await context.close();
    },
  };
};

export interface AudioPlayer {
  enqueue: (base64: string) => void;
  /** Drops everything still queued. Used for barge-in and the panic stop. */
  clear: () => void;
  close: () => Promise<void>;
}

export const createAudioPlayer = (): AudioPlayer => {
  const context = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
  const scheduled = new Set<AudioBufferSourceNode>();
  let nextStartTime = 0;

  const clear = () => {
    scheduled.forEach((source) => {
      try {
        source.stop();
      } catch {
        // Already finished.
      }
    });
    scheduled.clear();
    nextStartTime = 0;
  };

  return {
    enqueue: (base64) => {
      const samples = decodePcm16(base64);
      if (!samples.length) return;

      void context.resume();

      const buffer = context.createBuffer(1, samples.length, PLAYBACK_SAMPLE_RATE);
      buffer.copyToChannel(samples, 0);

      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);

      const startAt = Math.max(context.currentTime, nextStartTime);
      source.start(startAt);
      nextStartTime = startAt + buffer.duration;

      scheduled.add(source);
      source.onended = () => scheduled.delete(source);
    },
    clear,
    close: async () => {
      clear();
      await context.close();
    },
  };
};
