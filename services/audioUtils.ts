export function encode(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

export function decode(input: Int16Array): Float32Array {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = input[i];
    output[i] = s < 0 ? s / 0x8000 : s / 0x7FFF;
  }
  return output;
}

export function createPCM16Blob(inputData: Float32Array): string {
    const pcm16Data = encode(inputData);
    const base64 = btoa(
        String.fromCharCode(...new Uint8Array(pcm16Data.buffer))
    );
    return base64;
}
