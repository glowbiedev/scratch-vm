const BlockType = require('../extension-support/block-type');
const ArgumentType = require('../extension-support/argument-type');

/* eslint-disable-next-line max-len */
const blockIconURI = 'data:image/svg+xml,%3Csvg id="rotate-counter-clockwise" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cdefs%3E%3Cstyle%3E.cls-1%7Bfill:%233d79cc;%7D.cls-2%7Bfill:%23fff;%7D%3C/style%3E%3C/defs%3E%3Ctitle%3Erotate-counter-clockwise%3C/title%3E%3Cpath class="cls-1" d="M22.68,12.2a1.6,1.6,0,0,1-1.27.63H13.72a1.59,1.59,0,0,1-1.16-2.58l1.12-1.41a4.82,4.82,0,0,0-3.14-.77,4.31,4.31,0,0,0-2,.8,4.25,4.25,0,0,0-1.34,1.73,5.06,5.06,0,0,0,.54,4.62A5.58,5.58,0,0,0,12,17.74h0a2.26,2.26,0,0,1-.16,4.52A10.25,10.25,0,0,1,3.74,18,10.14,10.14,0,0,1,2.25,8.78,9.7,9.7,0,0,1,5.08,4.64,9.92,9.92,0,0,1,9.66,2.5a10.66,10.66,0,0,1,7.72,1.68l1.08-1.35a1.57,1.57,0,0,1,1.24-.6,1.6,1.6,0,0,1,1.54,1.21l1.7,7.37A1.57,1.57,0,0,1,22.68,12.2Z"/%3E%3Cpath class="cls-2" d="M21.38,11.83H13.77a.59.59,0,0,1-.43-1l1.75-2.19a5.9,5.9,0,0,0-4.7-1.58,5.07,5.07,0,0,0-4.11,3.17A6,6,0,0,0,7,15.77a6.51,6.51,0,0,0,5,2.92,1.31,1.31,0,0,1-.08,2.62,9.3,9.3,0,0,1-7.35-3.82A9.16,9.16,0,0,1,3.17,9.12,8.51,8.51,0,0,1,5.71,5.4,8.76,8.76,0,0,1,9.82,3.48a9.71,9.71,0,0,1,7.75,2.07l1.67-2.1a.59.59,0,0,1,1,.21L22,11.08A.59.59,0,0,1,21.38,11.83Z"/%3E%3C/svg%3E';

class Scratch3AIBlocks {
    constructor (runtime) {
        this.runtime = runtime;
        this._answer = '';
        this._translation = '';
        this._ready = false;
        this._isFetching = false;
        this._socket = null;
    }

    getInfo () {
        return {
            id: 'ai',
            name: 'AI',
            blocks: [
                {
                    opcode: 'askAI',
                    blockType: BlockType.COMMAND,
                    text: 'ask AI [PROMPT]',
                    arguments: {
                        PROMPT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello!'
                        }
                    }
                },
                {
                    opcode: 'getAnswer',
                    blockType: BlockType.REPORTER,
                    text: 'AI answer'
                },
                '---',
                {
                    opcode: 'translate',
                    blockType: BlockType.COMMAND,
                    text: 'translate [TEXT] to [LANGUAGE]',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello'
                        },
                        LANGUAGE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Indonesian'
                        }
                    }
                },
                {
                    opcode: 'getTranslation',
                    blockType: BlockType.REPORTER,
                    text: 'translation result'
                },
                '---',
                {
                    opcode: 'isReady',
                    blockType: BlockType.BOOLEAN,
                    text: 'AI is ready?'
                },
                '---',
                {
                    opcode: 'speak',
                    blockType: BlockType.COMMAND,
                    text: 'speak [TEXT] language [LANG] voice [VOICE]',
                    arguments: {
                        TEXT: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Hello'
                        },
                        LANG: {
                            type: ArgumentType.STRING,
                            defaultValue: 'en'
                        },
                        VOICE: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Chirp3-HD-Aoede'
                        }
                    }
                }
            ]
        };
    }

    getPrimitives () {
        return {
            ai_ask: this.askAI.bind(this),
            ai_answer: this.getAnswer.bind(this),
            ai_translate: this.translate.bind(this),
            ai_translation: this.getTranslation.bind(this),
            ai_isready: this.isReady.bind(this),
            tts: this.speak.bind(this)
        };
    }

    _loadSocketIO () {
        return new Promise((resolve, reject) => {
            if (typeof io !== 'undefined') return resolve();

            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load socket.io'));
            document.head.appendChild(script);
        });
    }

    _connectSocket () {
        return new Promise((resolve, reject) => {
            if (this._socket && this._socket.connected) return resolve();

            if (this._socket) {
                this._socket.once('connect', resolve);
                return;
            }

            this._loadSocketIO()
                .then(() => {
                    this._socket = io('https://glowbie-be-398118799500.asia-southeast1.run.app'); // eslint-disable-line no-undef

                    const timer = setTimeout(() => {
                        reject(new Error('Socket connection timeout'));
                    }, 5000);

                    this._socket.once('connect', () => {
                        clearTimeout(timer);
                        console.log('[TTS] Connected to TTS server');
                        resolve();
                    });

                    this._socket.on('disconnect', () => {
                        console.warn('[TTS] Disconnected from TTS server');
                    });
                })
                .catch(reject);
        });
    }

    askAI (args) {
        if (this._isFetching) return;

        this._ready = false;
        this._isFetching = true;
        const prompt = args.PROMPT;

        return fetch('https://glowbie-be-398118799500.asia-southeast1.run.app/ask-codelab', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({prompt})
        })
            .then(res => res.json())
            .then(data => {
                this._answer = data.result;
                this._ready = true;
                this._isFetching = false;
            })
            .catch(err => {
                console.error('[AI] Error:', err);
                this._isFetching = false;
            });
    }

    getAnswer () {
        return this._answer;
    }

    translate (args) {
        const text = args.TEXT;
        const language = args.LANGUAGE;

        return fetch('https://glowbie-be-398118799500.asia-southeast1.run.app/translate-codelab', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text, language})
        })
            .then(res => res.json())
            .then(data => {
                this._translation = data.result;
            })
            .catch(err => {
                console.error('[Translate] Error:', err);
            });
    }

    getTranslation () {
        return this._translation;
    }

    isReady () {
        return this._ready;
    }

    speak (args) {
        const text = args.TEXT;
        const lang = args.LANG || 'en';
        const voiceActor = args.VOICE || 'Chirp3-HD-Aoede';

        return new Promise(resolve => {
            this._connectSocket()
                .then(() => {
                    const audioChunks = [];

                    const onAudioChunk = base64Data => {
                        const binary = atob(base64Data);
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                        }
                        audioChunks.push(bytes.buffer);
                    };

                    const onDone = () => {
                        this._socket.off('audio_chunk', onAudioChunk);
                        this._socket.off('synthesis_done', onDone);
                        this._socket.off('error', onError); // eslint-disable-line no-use-before-define
                        if (audioChunks.length === 0) return resolve();

                        const totalLength = audioChunks.reduce((sum, buf) => sum + buf.byteLength, 0);
                        const pcm = new Uint8Array(totalLength);
                        let offset = 0;
                        for (const buf of audioChunks) {
                            pcm.set(new Uint8Array(buf), offset);
                            offset += buf.byteLength;
                        }

                        const sampleRate = 24000;
                        const numChannels = 1;
                        const bitsPerSample = 16;
                        const byteRate = sampleRate * numChannels * bitsPerSample / 8;
                        const blockAlign = numChannels * bitsPerSample / 8;
                        const wavHeader = new ArrayBuffer(44);
                        const view = new DataView(wavHeader);

                        const writeStr = (v, o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
                        writeStr(view, 0, 'RIFF');
                        view.setUint32(4, 36 + pcm.byteLength, true);
                        writeStr(view, 8, 'WAVE');
                        writeStr(view, 12, 'fmt ');
                        view.setUint32(16, 16, true);
                        view.setUint16(20, 1, true);
                        view.setUint16(22, numChannels, true);
                        view.setUint32(24, sampleRate, true);
                        view.setUint32(28, byteRate, true);
                        view.setUint16(32, blockAlign, true);
                        view.setUint16(34, bitsPerSample, true);
                        writeStr(view, 36, 'data');
                        view.setUint32(40, pcm.byteLength, true);

                        const wav = new Uint8Array(44 + pcm.byteLength);
                        wav.set(new Uint8Array(wavHeader), 0);
                        wav.set(pcm, 44);

                        const AudioContext = window.AudioContext || window.webkitAudioContext;
                        const audioCtx = new AudioContext();

                        audioCtx.decodeAudioData(wav.buffer)
                            .then(decoded => {
                                const source = audioCtx.createBufferSource();
                                source.buffer = decoded;
                                source.connect(audioCtx.destination);
                                source.onended = () => resolve();
                                source.start();
                            })
                            .catch(err => {
                                console.error('[TTS] Audio playback error:', err);
                                resolve();
                            });
                    };

                    const onError = err => {
                        this._socket.off('audio_chunk', onAudioChunk);
                        this._socket.off('synthesis_done', onDone);
                        this._socket.off('error', onError);
                        console.error('[TTS] Server error:', err);
                        resolve();
                    };

                    this._socket.on('audio_chunk', onAudioChunk);
                    this._socket.on('synthesis_done', onDone);
                    this._socket.on('error', onError);

                    this._socket.emit('synthesize_chunk', {
                        text,
                        lang,
                        voice_actor: voiceActor
                    });
                })
                .catch(err => {
                    console.error('[TTS] Connection failed:', err.message);
                    resolve();
                });
        });
    }
}

module.exports = Scratch3AIBlocks;
