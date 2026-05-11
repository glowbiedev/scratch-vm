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
