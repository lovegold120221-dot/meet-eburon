import { registeredWorklets } from './core/worklet-registry';
// import { CONFIG } from '../config/config.js'; // Removed config dependency, pass params instead if needed

/**
 * @class AudioStreamer
 * @description Manages the playback of audio data, including support for queuing, scheduling, and applying audio effects through worklets.
 */
export class AudioStreamer {
    context: AudioContext;
    audioQueue: Float32Array[];
    isPlaying: boolean;
    _sampleRate: number = 24000;
    bufferSize: number = 7680;
    processingBuffer: Float32Array;
    scheduledTime: number;
    gainNode: GainNode;
    source: AudioBufferSourceNode;
    isStreamComplete: boolean;
    checkInterval: number | null | NodeJS.Timeout;
    initialBufferTime: number = 0.05;
    endOfQueueAudioSource: AudioBufferSourceNode | null;
    onComplete: () => void;
    isInitialized: boolean;
    
    /**
     * @constructor
     * @param {AudioContext} context - The AudioContext instance to use for audio processing.
     */
    constructor(context: AudioContext) {
        this.context = context;
        this.audioQueue = [];
        this.isPlaying = false;
        // this.sampleRate = 24000; // Handled by field init
        // this.bufferSize = 7680; // Handled by field init
        this.processingBuffer = new Float32Array(0);
        this.scheduledTime = 0;
        this.gainNode = this.context.createGain();
        this.source = this.context.createBufferSource();
        this.isStreamComplete = false;
        this.checkInterval = null;
        this.initialBufferTime = 0.05;
        this.endOfQueueAudioSource = null;
        this.onComplete = () => { };
        this.isInitialized = false;
        
        this.gainNode.connect(this.context.destination);
        this.addPCM16 = this.addPCM16.bind(this);
    }

    
    /**
     * Get the current sample rate
     */
    get sampleRate(): number {
        return this._sampleRate;
    }

    /**
     * Set the sample rate and update buffer size accordingly
     */
    set sampleRate(value: number) {
        this._sampleRate = value;
        // Update buffer size based on sample rate to maintain consistent timing
        this.bufferSize = Math.floor(value * 0.32); // 320ms buffer
    }

    /**
     * @method addWorklet
     * @description Adds an audio worklet to the processing pipeline.
     * @param {string} workletName - The name of the worklet.
     * @param {string} workletSrc - The source URL of the worklet script.
     * @param {Function} handler - The message handler function for the worklet.
     * @returns {Promise<AudioStreamer>} A promise that resolves with the AudioStreamer instance when the worklet is added.
     * @async
     */
    async addWorklet(workletName: string, workletSrc: string, handler: (ev: MessageEvent) => void): Promise<AudioStreamer> {
        let workletsRecord = registeredWorklets.get(this.context);
        if (workletsRecord && workletsRecord[workletName]) {
            workletsRecord[workletName].handlers.push(handler);
            return Promise.resolve(this);
        }

        if (!workletsRecord) {
            registeredWorklets.set(this.context, {});
            workletsRecord = registeredWorklets.get(this.context);
        }

        workletsRecord[workletName] = { handlers: [handler] };

        try {
            const absolutePath = `/${workletSrc}`;
            await this.context.audioWorklet.addModule(absolutePath);
        } catch (error) {
            console.error('Error loading worklet:', error);
            throw error;
        }
        const worklet = new AudioWorkletNode(this.context, workletName);

        workletsRecord[workletName].node = worklet;

        return this;
    }

    /**
     * @method addPCM16
     * @description Adds a chunk of PCM16 audio data to the streaming queue.
     * @param {Int16Array} chunk - The audio data chunk.
     */
    addPCM16(chunk: Int16Array) {

        if (!this.isInitialized) {
            console.warn('AudioStreamer not initialized. Call initialize() first.');
            return;
        }

        const float32Array = new Float32Array(chunk.length);
        // Note: original logic had chunk.length / 2 but Int16Array length is number of elements, not bytes.
        // Assuming chunk IS Int16Array of samples.
        // If chunk.buffer is shared, constructing DataView might be needed.
        // BUT loop logic: i < chunk.length / 2 suggests previously chunk was maybe Uint8Array or similar?
        // The calling code passes Int16Array directly. So chunk.length is count of samples.
        // Wait, loop max: chunk.length / 2?
        // Let's look at `useGeminiLive`: `const int16 = new Int16Array(bytes.buffer);`
        // So chunk IS Int16Array. 
        // If we want Float32, 1 int16 = 1 float32.
        // Why `chunk.length / 2`? Maybe accidental copy from byte logic?
        // Let's correct it to `chunk.length`.
         
        for (let i = 0; i < chunk.length; i++) {
             // Normalized -1.0 to 1.0
             float32Array[i] = chunk[i] / 32768;
        }

        const newBuffer = new Float32Array(this.processingBuffer.length + float32Array.length);
        newBuffer.set(this.processingBuffer);
        newBuffer.set(float32Array, this.processingBuffer.length);
        this.processingBuffer = newBuffer;

        while (this.processingBuffer.length >= this.bufferSize) {
            const buffer = this.processingBuffer.slice(0, this.bufferSize);
            this.audioQueue.push(buffer);
            this.processingBuffer = this.processingBuffer.slice(this.bufferSize);
        }

        if (!this.isPlaying) {
            this.isPlaying = true;
            this.scheduledTime = this.context.currentTime + this.initialBufferTime;
            this.scheduleNextBuffer();
        }
    }

    /**
     * @method createAudioBuffer
     * @description Creates an AudioBuffer from the given audio data.
     * @param {Float32Array} audioData - The audio data.
     * @returns {AudioBuffer} The created AudioBuffer.
     */
    createAudioBuffer(audioData: Float32Array): AudioBuffer {
        const audioBuffer = this.context.createBuffer(1, audioData.length, this.sampleRate);
        audioBuffer.getChannelData(0).set(audioData);
        return audioBuffer;
    }

    /**
     * @method scheduleNextBuffer
     * @description Schedules the next audio buffer for playback.
     */
    scheduleNextBuffer() {
        const SCHEDULE_AHEAD_TIME = 0.2;

        while (this.audioQueue.length > 0 && this.scheduledTime < this.context.currentTime + SCHEDULE_AHEAD_TIME) {
            const audioData = this.audioQueue.shift();
            if (!audioData) continue;
            
            const audioBuffer = this.createAudioBuffer(audioData);
            const source = this.context.createBufferSource();

            if (this.audioQueue.length === 0) {
                if (this.endOfQueueAudioSource) {
                    this.endOfQueueAudioSource.onended = null;
                }
                this.endOfQueueAudioSource = source;
                source.onended = () => {
                    if (!this.audioQueue.length && this.endOfQueueAudioSource === source) {
                        this.endOfQueueAudioSource = null;
                        this.onComplete();
                    }
                };
            }

            source.buffer = audioBuffer;
            source.connect(this.gainNode);

            const worklets = registeredWorklets.get(this.context);

            if (worklets) {
                Object.entries(worklets).forEach(([workletName, graph]: [string, any]) => {
                    const { node, handlers } = graph;
                    if (node) {
                        source.connect(node);
                        node.port.onmessage = function (ev: MessageEvent) {
                            handlers.forEach((handler: Function) => {
                                handler.call(node.port, ev);
                            });
                        };
                        node.connect(this.context.destination);
                    }
                });
            }

            const startTime = Math.max(this.scheduledTime, this.context.currentTime);
            source.start(startTime);

            this.scheduledTime = startTime + audioBuffer.duration;
        }

        if (this.audioQueue.length === 0 && this.processingBuffer.length === 0) {
            if (this.isStreamComplete) {
                this.isPlaying = false;
                if (this.checkInterval) {
                    // clearInterval not strictly compatible with strict types depending on env (browser vs node)
                    // casting to any works
                    clearInterval(this.checkInterval as any);
                    this.checkInterval = null;
                }
            } else {
                if (!this.checkInterval) {
                    this.checkInterval = setInterval(() => {
                        if (this.audioQueue.length > 0 || this.processingBuffer.length >= this.bufferSize) {
                            this.scheduleNextBuffer();
                        }
                    }, 100);
                }
            }
        } else {
            const nextCheckTime = (this.scheduledTime - this.context.currentTime) * 1000;
            setTimeout(() => this.scheduleNextBuffer(), Math.max(0, nextCheckTime - 50));
        }
    }

    /**
     * @method stop
     * @description Stops the audio stream.
     */
    stop() {
        this.isPlaying = false;
        this.isStreamComplete = true;
        this.audioQueue = [];
        this.processingBuffer = new Float32Array(0);
        this.scheduledTime = this.context.currentTime;

        if (this.checkInterval) {
            clearInterval(this.checkInterval as any);
            this.checkInterval = null;
        }

        this.gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 0.1);

        setTimeout(() => {
            this.gainNode.disconnect();
            this.gainNode = this.context.createGain();
            this.gainNode.connect(this.context.destination);
        }, 200);
    }

    /**
     * @method resume
     * @description Resumes the audio stream if the AudioContext was suspended.
     * @async
     */
    async resume() {
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
        this.isStreamComplete = false;
        this.scheduledTime = this.context.currentTime + this.initialBufferTime;
        this.gainNode.gain.setValueAtTime(1, this.context.currentTime);
    }

    /**
     * @method complete
     * @description Marks the audio stream as complete and schedules any remaining data in the buffer.
     */
    complete() {
        this.isStreamComplete = true;
        if (this.processingBuffer.length > 0) {
            this.audioQueue.push(this.processingBuffer);
            this.processingBuffer = new Float32Array(0);
            if (this.isPlaying) {
                this.scheduleNextBuffer();
            }
        } else {
            this.onComplete();
        }
    }

    /**
     * @method initialize
     * @description Initializes the AudioStreamer instance.
     * @returns {Promise<AudioStreamer>} A promise that resolves with the AudioStreamer instance when initialization is complete.
     * @async
     */
    async initialize(): Promise<AudioStreamer> {
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }
        this.isInitialized = true;
        return this;
    }
} 